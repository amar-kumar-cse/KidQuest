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
 * Reject a task — resets it to 'pending' so the kid can resubmit.
 * Stores parent's rejection reason as parentNote.
 */
exports.rejectTask = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
    }
    const { taskId, parentNote = '' } = data;
    if (!taskId || typeof taskId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'taskId is required.');
    }
    const db = admin.firestore();
    const taskRef = db.collection('Tasks').doc(taskId);
    const taskSnap = await taskRef.get();
    if (!taskSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Task not found.');
    }
    const task = taskSnap.data();
    if (task.parentId !== context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'Not the task owner.');
    }
    if (task.status !== 'pending_approval') {
        throw new functions.https.HttpsError('failed-precondition', `Task status is "${task.status}", expected "pending_approval".`);
    }
    // Reset task so kid can try again
    await taskRef.update({
        status: 'pending',
        proofUrl: admin.firestore.FieldValue.delete(),
        proofNote: admin.firestore.FieldValue.delete(),
        completedAt: admin.firestore.FieldValue.delete(),
        parentNote: parentNote || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
});
//# sourceMappingURL=rejectTask.js.map