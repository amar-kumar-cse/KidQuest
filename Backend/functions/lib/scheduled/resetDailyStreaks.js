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
 * resetDailyStreaks Scheduled Function (Phase 4)
 * - Runs every night at 12:00 AM IST ('0 0 * * *' in Asia/Kolkata)
 * - Checks all active child profiles who currently have a streak > 0
 * - If last completed task was BEFORE yesterday (i.e. child missed an entire calendar day),
 *   resets currentStreak to 0 and adjusts HP fairly.
 * - Robust batch chunking: commits in safe batches of 400 documents.
 */
exports.resetDailyStreaks = functions
    .region('asia-south1')
    .pubsub.schedule('0 0 * * *')
    .timeZone('Asia/Kolkata')
    .onRun(async () => {
    console.log('[resetDailyStreaks] Starting daily midnight IST streak check...');
    const db = admin.firestore();
    // Today midnight in IST
    const now = new Date();
    // Yesterday midnight in IST: 24h before today's start
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayMidnight = todayMidnight - 24 * 60 * 60 * 1000;
    // Find all children with an active streak (> 0)
    const snaps = await db
        .collection('Users')
        .where('role', '==', 'kid')
        .where('currentStreak', '>', 0)
        .get();
    if (snaps.empty) {
        console.log('[resetDailyStreaks] No active streaks to evaluate.');
        return { success: true, updated: 0 };
    }
    let batch = db.batch();
    let batchCount = 0;
    let totalUpdated = 0;
    for (const doc of snaps.docs) {
        const data = doc.data() || {};
        const lastCompletedAt = data.lastCompletedAt instanceof admin.firestore.Timestamp
            ? data.lastCompletedAt.toDate()
            : null;
        // If never completed or last completion was strictly before yesterday midnight, streak is broken
        const lastCompletionTime = lastCompletedAt ? lastCompletedAt.getTime() : 0;
        if (lastCompletionTime < yesterdayMidnight) {
            const currentHp = typeof data.hp === 'number' ? data.hp : 100;
            const newHp = Math.max(0, currentHp - 15); // Slight HP deduction on missed streak
            batch.update(doc.ref, {
                currentStreak: 0,
                hp: newHp,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            batchCount++;
            totalUpdated++;
            // Commit and reset batch when approaching 400 docs limit
            if (batchCount >= 400) {
                await batch.commit();
                batch = db.batch();
                batchCount = 0;
            }
        }
    }
    if (batchCount > 0) {
        await batch.commit();
    }
    console.log(`[resetDailyStreaks] Finished. Evaluated ${snaps.size} kids, reset streaks for ${totalUpdated}.`);
    return { success: true, updated: totalUpdated, evaluated: snaps.size };
});
//# sourceMappingURL=resetDailyStreaks.js.map