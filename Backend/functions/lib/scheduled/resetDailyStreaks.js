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
exports.resetDailyStreaks = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
/**
 * Scheduled function that runs daily and resets `currentStreak` to 0
 * for users who have not completed a task in the last 24 hours.
 */
exports.resetDailyStreaks = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async (context) => {
    const db = admin.firestore();
    const threshold = Date.now() - 24 * 60 * 60 * 1000;
    // Find kids whose lastCompletedAt is older than 24h and currentStreak > 0
    const q = db.collection('Users').where('role', '==', 'kid').where('currentStreak', '>', 0);
    const snaps = await q.get();
    const batch = db.batch();
    let ops = 0;
    snaps.forEach((doc) => {
        const data = doc.data();
        const last = data.lastCompletedAt ? new Date(data.lastCompletedAt.seconds * 1000) : null;
        if (!last || last.getTime() < threshold) {
            batch.update(doc.ref, { currentStreak: 0, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            ops++;
        }
        if (ops === 500) {
            // commit and start a new batch if too many
            batch.commit();
        }
    });
    if (ops > 0)
        await batch.commit();
    return { success: true, updated: ops };
});
//# sourceMappingURL=resetDailyStreaks.js.map