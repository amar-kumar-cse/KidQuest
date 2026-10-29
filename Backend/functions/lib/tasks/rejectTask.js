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
exports.rejectTask = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
/**
 * rejectTask callable function (Phase 4)
 * - Verifies caller is authorized parent
 * - Resets task to 'pending' so child can redo it, or marks 'rejected'
 * - Cleans up submission proof
 * - Creates an explanatory in-app notification for the child
 */
exports.rejectTask = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to reject tasks.');
    }
    const { taskId, reason } = data;
    if (!taskId || typeof taskId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Valid taskId is required.');
    }
    const db = admin.firestore();
    const callerUid = context.auth.uid;
    const callerRef = db.collection('Users').doc(callerUid);
    const taskRef = db.collection('Tasks').doc(taskId);
    const [callerSnap, taskSnap] = await Promise.all([callerRef.get(), taskRef.get()]);
    if (!callerSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Caller profile not found.');
    }
    if (!taskSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Task not found.');
    }
    const caller = callerSnap.data() || {};
    const task = taskSnap.data() || {};
    const isAdmin = caller.role === 'admin' || context.auth.token.admin === true;
    if (caller.role !== 'parent' && !isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Only parents can reject tasks.');
    }
    // Authorization check (support parentId direct ownership and linkedKids)
    const isAuthorized = task.parentId === callerUid ||
        (Array.isArray(caller.linkedKids) && caller.linkedKids.includes(task.assignedToUid)) ||
        (caller.familyId && task.familyId && caller.familyId === task.familyId) ||
        isAdmin;
    if (!isAuthorized) {
        throw new functions.https.HttpsError('permission-denied', 'Task does not belong to your family.');
    }
    // Idempotency check: if already pending or rejected
    if (task.status === 'pending' && !task.proofUrl) {
        return { success: true, alreadyProcessed: true };
    }
    const now = admin.firestore.Timestamp.now();
    const kidUid = task.assignedToUid;
    const rejectionReason = reason || 'Please review instructions and try again!';
    // Reset task status so kid can submit new proof
    await taskRef.update({
        status: 'pending',
        proofUrl: admin.firestore.FieldValue.delete(),
        proofNote: admin.firestore.FieldValue.delete(),
        completedAt: admin.firestore.FieldValue.delete(),
        rejectedAt: now,
        rejectedBy: callerUid,
        rejectionReason,
        updatedAt: now,
    });
    // Create friendly feedback notification for kid
    if (kidUid) {
        const notifRef = db.collection('Notifications').doc();
        await notifRef.set({
            recipientId: kidUid,
            type: 'task_rejected',
            taskId,
            title: '🔄 Task Needs Another Try',
            body: `"${task.title}" needs a quick fix: ${rejectionReason}`,
            createdAt: now,
            isRead: false,
        });
    }
    return { success: true, taskId, status: 'pending' };
});
//# sourceMappingURL=rejectTask.js.map