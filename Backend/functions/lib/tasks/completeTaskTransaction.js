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
exports.completeTaskTransaction = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
/**
 * completeTaskTransaction
 * - Params: { taskId, childUid }
 * - Verifies caller is a parent and in same family as child
 * - Uses transaction to mark task 'completed' and increment child's totalXp atomically
 * - Updates streak if applicable
 * - Idempotent: if task already approved/completed, returns alreadyProcessed
 * - Sends Expo push via HTTP (best-effort)
 *
 * NOTE: This is a unified approval function. The frontend should call either
 *       this OR `approveTask` — both do the same thing. This one reads XP from
 *       the task document itself (task.xp) instead of requiring it as a parameter.
 */
exports.completeTaskTransaction = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
    const callerUid = context.auth.uid;
    const { taskId, childUid } = data;
    if (!taskId || !childUid) {
        throw new functions.https.HttpsError('invalid-argument', 'taskId and childUid are required.');
    }
    const db = admin.firestore();
    const callerRef = db.collection('Users').doc(callerUid);
    const childRef = db.collection('Users').doc(childUid);
    const taskRef = db.collection('Tasks').doc(taskId);
    const result = await db.runTransaction(async (tx) => {
        const [callerSnap, childSnap, taskSnap] = await Promise.all([
            tx.get(callerRef),
            tx.get(childRef),
            tx.get(taskRef),
        ]);
        if (!callerSnap.exists)
            throw new functions.https.HttpsError('not-found', 'Caller profile not found.');
        if (!childSnap.exists)
            throw new functions.https.HttpsError('not-found', 'Child profile not found.');
        if (!taskSnap.exists)
            throw new functions.https.HttpsError('not-found', 'Task not found.');
        const caller = callerSnap.data();
        const child = childSnap.data();
        const task = taskSnap.data();
        if (caller.role !== 'parent')
            throw new functions.https.HttpsError('permission-denied', 'Only parents can approve tasks.');
        if (!caller.familyId || caller.familyId !== child.familyId)
            throw new functions.https.HttpsError('permission-denied', 'Parent and child must share a familyId.');
        if (task.assignedToUid !== childUid || task.familyId !== caller.familyId)
            throw new functions.https.HttpsError('failed-precondition', 'Task not assigned to child or not in family.');
        // Idempotency: check if already approved/completed
        if (task.status === 'completed' || task.approvedAt || task.status === 'approved') {
            return { success: true, alreadyProcessed: true, xpAwarded: 0 };
        }
        const xpValue = typeof task.xp === 'number' ? task.xp : 0;
        const bonusXp = typeof task.bonusXp === 'number' ? task.bonusXp : 0;
        const totalXpAward = xpValue + bonusXp;
        const now = admin.firestore.Timestamp.now();
        // Streak logic
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
        // Update task and child atomically
        tx.update(taskRef, {
            status: 'completed',
            finalXp: totalXpAward,
            approvedAt: now,
            approvedBy: callerUid,
            updatedAt: now,
        });
        tx.update(childRef, {
            totalXp: admin.firestore.FieldValue.increment(totalXpAward),
            tasksCompleted: admin.firestore.FieldValue.increment(1),
            lastCompletedAt: now,
            currentStreak: newStreak,
            bestStreak: bestStreak,
        });
        // In-app notification
        const notifRef = db.collection('Notifications').doc();
        tx.set(notifRef, {
            recipientId: childUid,
            type: 'task_approved',
            taskId,
            xpAwarded: totalXpAward,
            title: 'Task Approved! 🎉',
            body: `You earned ${totalXpAward} XP for "${task.title || 'a task'}"!`,
            createdAt: now,
            isRead: false,
            by: callerUid,
            familyId: caller.familyId,
        });
        return { success: true, xpAwarded: totalXpAward };
    });
    // Send Expo push notification to child (best-effort, outside transaction)
    if (result.xpAwarded && result.xpAwarded > 0) {
        try {
            const childSnap = await db.collection('Users').doc(childUid).get();
            const childData = childSnap.exists ? childSnap.data() : null;
            const pushToken = childData?.expoPushToken;
            if (pushToken && typeof pushToken === 'string') {
                await axios_1.default.post('https://exp.host/--/api/v2/push/send', {
                    to: pushToken,
                    sound: 'default',
                    title: '🎉 Task Approved!',
                    body: `Great job! You earned ${result.xpAwarded} XP!`,
                    data: { type: 'task_approved', taskId },
                }, { headers: { 'Content-Type': 'application/json' }, timeout: 5000 });
            }
        }
        catch (err) {
            console.warn('[completeTaskTransaction] Expo push failed:', err?.toString?.() || err);
        }
    }
    return result;
});
//# sourceMappingURL=completeTaskTransaction.js.map