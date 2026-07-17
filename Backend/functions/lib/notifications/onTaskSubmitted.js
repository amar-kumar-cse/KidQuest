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
exports.onTaskSubmitted = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
/**
 * Firestore trigger: When a task's status changes to 'pending_approval',
 * send a push notification to the parent via Expo Push API.
 *
 * This fires automatically when the kid submits proof (status: pending → pending_approval).
 */
exports.onTaskSubmitted = functions.firestore
    .document('Tasks/{taskId}')
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    // Only fire when status transitions to pending_approval
    if (before.status === after.status || after.status !== 'pending_approval') {
        return null;
    }
    const parentId = after.parentId;
    if (!parentId)
        return null;
    const db = admin.firestore();
    // Fetch parent's push token
    const parentSnap = await db.collection('Users').doc(parentId).get();
    if (!parentSnap.exists)
        return null;
    const parent = parentSnap.data();
    const pushToken = parent.expoPushToken;
    // Create in-app notification
    const notifRef = db.collection('Notifications').doc();
    await notifRef.set({
        recipientId: parentId,
        type: 'task_submitted',
        taskId: context.params.taskId,
        title: '⭐ Task Ready for Review!',
        body: `${after.assignedToName ?? after.assignedTo ?? 'Your kid'} completed "${after.title}" — tap to review!`,
        createdAt: admin.firestore.Timestamp.now(),
        isRead: false,
        familyId: after.familyId || null,
    });
    // Send Expo push notification (best-effort)
    if (pushToken && typeof pushToken === 'string') {
        try {
            await axios_1.default.post('https://exp.host/--/api/v2/push/send', {
                to: pushToken,
                sound: 'default',
                title: '⭐ Task Ready for Review!',
                body: `${after.assignedToName ?? after.assignedTo ?? 'Your kid'} completed "${after.title}" — tap to review!`,
                data: {
                    taskId: context.params.taskId,
                    type: 'task_submitted',
                },
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 5000,
            });
        }
        catch (err) {
            console.error('[onTaskSubmitted] Expo push send failed:', err?.toString?.() || err);
        }
    }
    return null;
});
//# sourceMappingURL=onTaskSubmitted.js.map