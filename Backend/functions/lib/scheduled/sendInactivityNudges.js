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
exports.sendInactivityNudges = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
const adminConfig_1 = require("../admin/adminConfig");
/**
 * Send nudges to kids who haven't completed any task in the last N days.
 */
exports.sendInactivityNudges = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async (context) => {
    const db = admin.firestore();
    const cfg = await (0, adminConfig_1.getAdminConfig)(db);
    const DAYS = cfg.INACTIVITY_DAYS || parseInt(process.env.INACTIVITY_DAYS || '2', 10);
    const threshold = Date.now() - (DAYS * 24 * 60 * 60 * 1000);
    const q = db.collection('Users').where('role', '==', 'kid');
    const snaps = await q.get();
    const notifications = [];
    snaps.forEach((doc) => {
        const data = doc.data();
        const last = data.lastCompletedAt ? new Date(data.lastCompletedAt.seconds * 1000) : null;
        if (!last || last.getTime() < threshold) {
            // Send Expo push if token exists
            const pushToken = data.expoPushToken;
            const message = `We miss you! Your streak may be at risk. Complete a task today to keep your streak going!`;
            if (pushToken) {
                const payload = { to: pushToken, sound: 'default', title: 'Come back!', body: message, data: { type: 'nudge' } };
                // Use Axios to send to Expo push endpoint (no SDK required)
                notifications.push(axios_1.default.post('https://exp.host/--/api/v2/push/send', payload, { headers: { 'Content-Type': 'application/json' } }).catch((e) => {
                    console.warn('Push failed for', doc.id, e && e.toString());
                }));
            }
            // Write in-app notification
            const notifRef = db.collection('Notifications').doc();
            notifications.push(notifRef.set({ recipientId: doc.id, type: 'inactivity_nudge', title: 'We miss you', body: message, createdAt: admin.firestore.FieldValue.serverTimestamp(), isRead: false, familyId: data.familyId }));
        }
    });
    await Promise.all(notifications);
    return { success: true };
});
//# sourceMappingURL=sendInactivityNudges.js.map