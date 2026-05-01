"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processTaskApproval = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
/**
 * processTaskApproval callable
 * - Params: { taskId, childUid, parentId }
 * - Verifies caller is the parent (caller.uid === parentId) and parent/child share familyId
 * - Uses transaction to mark task 'approved' and increment child's XP atomically
 * - Idempotent: if already completed/approved, returns alreadyProcessed
 * - Sends Expo push notification to child's push token if available
 */
exports.processTaskApproval = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
    }
    const callerUid = context.auth.uid;
    const { taskId, childUid, parentId } = data;
    if (!taskId || !childUid || !parentId) {
        throw new functions.https.HttpsError('invalid-argument', 'taskId, childUid and parentId are required.');
    }
    if (callerUid !== parentId) {
        throw new functions.https.HttpsError('permission-denied', 'Caller must be the parent specified by parentId.');
    }
    const db = admin.firestore();
    const parentRef = db.collection('Users').doc(parentId);
    const childRef = db.collection('Users').doc(childUid);
    const taskRef = db.collection('Tasks').doc(taskId);
    return db.runTransaction(async (tx) => {
        const [parentSnap, childSnap, taskSnap] = await Promise.all([
            tx.get(parentRef),
            tx.get(childRef),
            tx.get(taskRef),
        ]);
        if (!parentSnap.exists)
            throw new functions.https.HttpsError('not-found', 'Parent not found.');
        if (!childSnap.exists)
            throw new functions.https.HttpsError('not-found', 'Child not found.');
        if (!taskSnap.exists)
            throw new functions.https.HttpsError('not-found', 'Task not found.');
        const parent = parentSnap.data();
        const child = childSnap.data();
        const task = taskSnap.data();
        if (parent.role !== 'parent')
            throw new functions.https.HttpsError('permission-denied', 'User is not a parent.');
        // Family check
        if (!parent.familyId || !child.familyId || parent.familyId !== child.familyId) {
            throw new functions.https.HttpsError('permission-denied', 'Parent and child must belong to the same family.');
        }
        // Task ownership and idempotency
        if (task.assignedToUid !== childUid || task.familyId !== parent.familyId) {
            throw new functions.https.HttpsError('failed-precondition', 'Task not assigned to child or wrong family.');
        }
        if (task.status === 'completed' || task.status === 'approved' || task.approvedAt) {
            return { success: true, alreadyProcessed: true };
        }
        const xpValue = typeof task.xp === 'number' ? task.xp : (task.xpValue || 0);
        const now = admin.firestore.Timestamp.now();
        // Streak logic similar to other function
        const lastCompletedAt = child.lastCompletedAt;
        let newStreak = 1;
        let bestStreak = child.bestStreak || 0;
        if (lastCompletedAt) {
            const last = lastCompletedAt.toDate();
            const today = new Date();
            const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate()).getTime();
            const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
            const diffDays = Math.round((todayDay - lastDay) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) {
                newStreak = child.currentStreak || 1;
            }
            else if (diffDays === 1) {
                newStreak = (child.currentStreak || 0) + 1;
            }
            else {
                newStreak = 1;
            }
        }
        if (newStreak > bestStreak)
            bestStreak = newStreak;
        tx.update(taskRef, {
            status: 'completed',
            approvedAt: now,
            approvedBy: parentId,
            updatedAt: now,
        });
        tx.update(childRef, {
            totalXp: admin.firestore.FieldValue.increment(xpValue),
            tasksCompleted: admin.firestore.FieldValue.increment(1),
            lastCompletedAt: now,
            currentStreak: newStreak,
            bestStreak: bestStreak,
        });
        // Notification: send to child's expo push token if present (best-effort via HTTP)
        const pushToken = child.expoPushToken;
        if (pushToken && typeof pushToken === 'string') {
            const payload = {
                to: pushToken,
                sound: 'default',
                title: 'Task Approved!',
                body: `${task.title || 'A task'} was approved and ${xpValue} XP was awarded.`,
                data: { taskId, xp: xpValue },
            };
            // Fire-and-forget push send (non-blocking)
            setTimeout(async () => {
                try {
                    await axios_1.default.post('https://exp.host/--/api/v2/push/send', payload, {
                        headers: { 'Content-Type': 'application/json' },
                        timeout: 5000,
                    });
                }
                catch (err) {
                    console.warn('Expo push failed:', err && err.toString ? err.toString() : err);
                }
            }, 0);
        }
        return { success: true, xpAwarded: xpValue };
    });
});
//# sourceMappingURL=processTaskApproval.js.map