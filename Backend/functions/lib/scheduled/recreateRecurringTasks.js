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
exports.recreateRecurringTasks = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
/**
 * Runs daily at midnight (Asia/Kolkata timezone by default, or your preferred tz)
 * Finds all active recurring tasks (daily/weekly) and duplicates them if they
 * are due to be recreated today.
 */
exports.recreateRecurringTasks = functions.pubsub
    .schedule('0 0 * * *') // Every day at midnight
    .timeZone('Asia/Kolkata')
    .onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const today = new Date();
    const isMonday = today.getDay() === 1;
    console.log('[recreateRecurringTasks] Starting recurring tasks job.');
    // Find all incomplete tasks that have a frequency of 'daily' or 'weekly'
    let query = db.collection('Tasks').where('frequency', 'in', ['daily', 'weekly']);
    const snapshot = await query.get();
    if (snapshot.empty) {
        console.log('[recreateRecurringTasks] No recurring tasks found.');
        return null;
    }
    // Group by a unique key (title + assignedToUid + parentId) to find the latest
    const latestTasksMap = new Map();
    snapshot.forEach((doc) => {
        const data = doc.data();
        // Skip weekly tasks if today is not the start of the week (e.g., Monday)
        if (data.frequency === 'weekly' && !isMonday)
            return;
        const key = `${data.title}_${data.assignedToUid}_${data.parentId}`;
        if (!latestTasksMap.has(key)) {
            latestTasksMap.set(key, data);
        }
        else {
            const existing = latestTasksMap.get(key);
            if (data.createdAt?.toMillis() > existing.createdAt?.toMillis()) {
                latestTasksMap.set(key, data);
            }
        }
    });
    const batch = db.batch();
    let createCount = 0;
    for (const templateData of latestTasksMap.values()) {
        // Check if this latest task was created *today*. If so, don't recreate it.
        const createdDate = templateData.createdAt?.toDate();
        if (createdDate) {
            const isSameDay = createdDate.getFullYear() === today.getFullYear() &&
                createdDate.getMonth() === today.getMonth() &&
                createdDate.getDate() === today.getDate();
            if (isSameDay)
                continue;
        }
        // Duplicate the task
        const newTaskRef = db.collection('Tasks').doc();
        batch.set(newTaskRef, {
            title: templateData.title,
            description: templateData.description || '',
            xp: templateData.xp,
            difficulty: templateData.difficulty || 'easy',
            bonusXp: 0,
            finalXp: templateData.xp,
            assignedTo: templateData.assignedTo,
            assignedToUid: templateData.assignedToUid,
            parentId: templateData.parentId,
            familyId: templateData.familyId,
            status: 'pending',
            proofUrl: null,
            icon: templateData.icon || '📝',
            category: templateData.category || 'other',
            frequency: templateData.frequency,
            dueInHours: templateData.dueInHours ?? null,
            dueDate: null, // Reset due date if any
            createdAt: now,
            completedAt: null,
            approvedAt: null,
        });
        createCount++;
    }
    if (createCount > 0) {
        await batch.commit();
        console.log(`[recreateRecurringTasks] Successfully recreated ${createCount} recurring tasks.`);
    }
    else {
        console.log('[recreateRecurringTasks] No new recurring tasks needed to be created today.');
    }
    return null;
});
//# sourceMappingURL=recreateRecurringTasks.js.map