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
exports.onTaskApproved = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
/**
 * Firestore trigger: When a task's status changes to 'completed',
 * send a push notification to the kid via Expo Push API.
 *
 * This fires automatically when the parent approves a task via Cloud Function.
 */
exports.onTaskApproved = functions.firestore
    .document('Tasks/{taskId}')
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    // Only fire when status transitions to completed
    if (before.status === after.status || after.status !== 'completed') {
        return null;
    }
    const kidUid = after.assignedToUid;
    if (!kidUid)
        return null;
    const db = admin.firestore();
    // Fetch kid's push token
    const kidSnap = await db.collection('Users').doc(kidUid).get();
    if (!kidSnap.exists)
        return null;
    const kid = kidSnap.data();
    const pushToken = kid.expoPushToken;
    const xpAwarded = after.finalXp ?? after.xp ?? 0;
    // Create in-app notification
    const notifRef = db.collection('Notifications').doc();
    await notifRef.set({
        recipientId: kidUid,
        type: 'task_approved',
        taskId: context.params.taskId,
        xpAwarded,
        title: '🎉 Task Approved!',
        body: `You earned ${xpAwarded} XP for "${after.title}"! Keep it up! 🚀`,
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
                title: '🎉 Task Approved!',
                body: `You earned ${xpAwarded} XP for "${after.title}"! Keep it up! 🚀`,
                data: {
                    taskId: context.params.taskId,
                    type: 'task_approved',
                    xp: xpAwarded,
                },
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 5000,
            });
        }
        catch (err) {
            console.error('[onTaskApproved] Expo push send failed:', err?.toString?.() || err);
        }
    }
    return null;
});
//# sourceMappingURL=onTaskApproved.js.map