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
exports.createTask = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const adminConfig_1 = require("../admin/adminConfig");
/**
 * createTask callable
 * - Parents must call this to create tasks server-side to enforce limits.
 * - Params: { title, description, xp, assignedToUid, dueDate }
 */
exports.createTask = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
    const callerUid = context.auth.uid;
    const { title, description, xp, assignedToUid, dueDate } = data;
    if (!title || !description || typeof xp !== 'number' || !assignedToUid) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required task fields.');
    }
    const db = admin.firestore();
    const callerRef = db.collection('Users').doc(callerUid);
    const kidRef = db.collection('Users').doc(assignedToUid);
    return db.runTransaction(async (tx) => {
        const [callerSnap, kidSnap] = await Promise.all([tx.get(callerRef), tx.get(kidRef)]);
        if (!callerSnap.exists)
            throw new functions.https.HttpsError('not-found', 'Caller not found');
        if (!kidSnap.exists)
            throw new functions.https.HttpsError('not-found', 'Assigned kid not found');
        const caller = callerSnap.data();
        const kid = kidSnap.data();
        if (caller.role !== 'parent')
            throw new functions.https.HttpsError('permission-denied', 'Only parents can create tasks');
        if (!caller.familyId || caller.familyId !== kid.familyId)
            throw new functions.https.HttpsError('permission-denied', 'Parent and kid must share a family');
        // Enforce per-kid task limit (active tasks). Try adminConfig, fall back to env/default.
        const cfg = await (0, adminConfig_1.getAdminConfig)(db);
        const MAX_ACTIVE_TASKS = cfg.MAX_ACTIVE_TASKS || parseInt(process.env.MAX_ACTIVE_TASKS || '10', 10);
        const activeTasksSnap = await db.collection('Tasks')
            .where('assignedToUid', '==', assignedToUid)
            .where('status', 'in', ['pending', 'pending_approval'])
            .get();
        if (activeTasksSnap.size >= MAX_ACTIVE_TASKS) {
            throw new functions.https.HttpsError('resource-exhausted', `Assigned kid already has ${activeTasksSnap.size} active tasks (limit ${MAX_ACTIVE_TASKS}).`);
        }
        const taskRef = db.collection('Tasks').doc();
        const now = admin.firestore.FieldValue.serverTimestamp();
        tx.set(taskRef, {
            title,
            description,
            xp,
            status: 'pending',
            parentId: callerUid,
            assignedToUid,
            familyId: caller.familyId,
            createdAt: now,
            dueDate: dueDate || null,
        });
        return { success: true, taskId: taskRef.id };
    });
});
//# sourceMappingURL=createTask.js.map