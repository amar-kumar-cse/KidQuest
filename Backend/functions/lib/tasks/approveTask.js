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
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveTask = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
/**
 * approveTask callable function (Phase 4 Server-Authoritative Gamification)
 * - Verifies caller is authorized parent (via linkedKids, linkedParentId, or familyId)
 * - Atomic Firestore Transaction:
 *   1. Updates task to 'completed' with timestamp and parent UID
 *   2. Increments child totalXp and lifetimeXp
 *   3. Recomputes level based on lifetimeXp
 *   4. Recomputes daily streak fairly (midnight-based in IST)
 *   5. Writes immutable audit record into XpLedger
 * - Idempotent: safe against network retries (never double-awards XP)
 */
exports.approveTask = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to approve tasks.');
    }
    const { taskId, childUid, bonusXp = 0, parentNote } = data;
    if (!taskId || typeof taskId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Valid taskId is required.');
    }
    if (!childUid || typeof childUid !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Valid childUid is required.');
    }
    const db = admin.firestore();
    const callerUid = context.auth.uid;
    const callerRef = db.collection('Users').doc(callerUid);
    const childRef = db.collection('Users').doc(childUid);
    const taskRef = db.collection('Tasks').doc(taskId);
    const result = await db.runTransaction(async (tx) => {
        const [callerSnap, childSnap, taskSnap] = await Promise.all([
            tx.get(callerRef),
            tx.get(childRef),
            tx.get(taskRef),
        ]);
        if (!callerSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Parent profile not found.');
        }
        if (!childSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Child profile not found.');
        }
        if (!taskSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Task not found.');
        }
        const caller = callerSnap.data() || {};
        const child = childSnap.data() || {};
        const task = taskSnap.data() || {};
        // 1. Role verification: caller must be a parent or admin
        const isAdmin = caller.role === 'admin' || context.auth?.token.admin === true;
        if (caller.role !== 'parent' && !isAdmin) {
            throw new functions.https.HttpsError('permission-denied', 'Only parents can approve tasks.');
        }
        // 2. Relationship verification (support linkedKids, linkedParentId, and familyId)
        const isLinked = task.parentId === callerUid ||
            (Array.isArray(caller.linkedKids) && caller.linkedKids.includes(childUid)) ||
            child.linkedParentId === callerUid ||
            (caller.familyId && child.familyId && caller.familyId === child.familyId);
        if (!isLinked && !isAdmin) {
            throw new functions.https.HttpsError('permission-denied', 'You are not authorized to approve tasks for this child.');
        }
        // 3. Task assignment verification
        if (task.assignedToUid !== childUid) {
            throw new functions.https.HttpsError('failed-precondition', 'Task is not assigned to this child.');
        }
        // 4. Idempotency guard: if task is already completed, do not double-award XP
        if (task.status === 'completed' || task.approvedAt) {
            return { success: true, alreadyProcessed: true, xpAwarded: 0 };
        }
        const baseTaskXp = typeof task.xp === 'number' ? task.xp : 0;
        const safeBonus = typeof bonusXp === 'number' && bonusXp >= 0 ? Math.min(bonusXp, 500) : 0;
        const finalXp = baseTaskXp + safeBonus;
        // 5. Fair streak calculation (midnight boundary comparison)
        const now = admin.firestore.Timestamp.now();
        const nowDate = now.toDate();
        const lastCompletedAt = child.lastCompletedAt instanceof admin.firestore.Timestamp
            ? child.lastCompletedAt.toDate()
            : null;
        let newStreak = 1;
        let bestStreak = child.bestStreak || 0;
        if (lastCompletedAt) {
            const lastMidnight = new Date(lastCompletedAt.getFullYear(), lastCompletedAt.getMonth(), lastCompletedAt.getDate()).getTime();
            const todayMidnight = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();
            const diffDays = Math.round((todayMidnight - lastMidnight) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) {
                // Already completed a task today; retain streak
                newStreak = child.currentStreak || 1;
            }
            else if (diffDays === 1) {
                // Consecutive day; increment streak
                newStreak = (child.currentStreak || 0) + 1;
            }
            else {
                // Missed at least one calendar day; reset to 1
                newStreak = 1;
            }
        }
        if (newStreak > bestStreak) {
            bestStreak = newStreak;
        }
        // 6. Level calculation from lifetime XP: level = Math.floor(sqrt(lifetimeXp / 100)) + 1
        const currentLifetimeXp = child.lifetimeXp || child.totalXp || 0;
        const newLifetimeXp = currentLifetimeXp + finalXp;
        const newLevel = Math.max(1, Math.floor(Math.sqrt(newLifetimeXp / 100)) + 1);
        const newTotalXp = (child.totalXp || 0) + finalXp;
        // 7. Atomic batch updates
        tx.update(taskRef, {
            status: 'completed',
            finalXp,
            bonusXp: safeBonus,
            parentNote: parentNote || null,
            approvedAt: now,
            approvedBy: callerUid,
            updatedAt: now,
        });
        tx.update(childRef, {
            totalXp: newTotalXp,
            lifetimeXp: newLifetimeXp,
            level: newLevel,
            tasksCompleted: admin.firestore.FieldValue.increment(1),
            lastCompletedAt: now,
            lastActivityDate: nowDate.toISOString().slice(0, 10),
            currentStreak: newStreak,
            bestStreak,
            updatedAt: now,
        });
        // 8. Immutable XpLedger record (anti-cheat audit trail)
        const ledgerRef = db.collection('XpLedger').doc();
        tx.set(ledgerRef, {
            kidUid: childUid,
            parentId: callerUid,
            amount: finalXp,
            balanceAfter: newTotalXp,
            type: 'task_completed',
            referenceId: taskId,
            description: `Completed task: ${task.title}`,
            timestamp: now,
        });
        return {
            success: true,
            xpAwarded: finalXp,
            newStreak,
            newLevel,
            alreadyProcessed: false,
        };
    });
    return result;
});
//# sourceMappingURL=approveTask.js.map