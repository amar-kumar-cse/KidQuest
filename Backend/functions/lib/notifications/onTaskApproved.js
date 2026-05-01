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
exports.onTaskApproved = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
/**
 * Firestore trigger: When a task's status changes to 'completed',
 * send a push notification to the kid.
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
    const kidSnap = await admin
        .firestore()
        .collection('Users')
        .doc(after.assignedToUid)
        .get();
    const kid = kidSnap.data();
    const token = kid?.fcmToken ?? kid?.notificationToken;
    if (!token)
        return null;
    const xpAwarded = after.finalXp ?? after.xp;
    try {
        await admin.messaging().send({
            token,
            notification: {
                title: '🎉 Task Approved!',
                body: `You earned ${xpAwarded} XP for "${after.title}"! Keep it up! 🚀`,
            },
            data: {
                taskId: context.params.taskId,
                type: 'task_approved',
            },
            android: { priority: 'high' },
            apns: { payload: { aps: { sound: 'default' } } },
        });
    }
    catch (err) {
        console.error('[onTaskApproved] FCM send failed:', err);
    }
    return null;
});
//# sourceMappingURL=onTaskApproved.js.map