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
exports.setUserRole = exports.syncUserCustomClaims = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
/**
 * syncUserCustomClaims Trigger:
 * Firestore onCreate/onUpdate trigger on Users/{uid}.
 * Automatically syncs the user's role and linkedParentId into Firebase Auth Custom Claims.
 * This enables 0-read, instant evaluation inside firestore.rules and storage.rules!
 */
exports.syncUserCustomClaims = functions.firestore
    .document('Users/{uid}')
    .onWrite(async (change, context) => {
    const uid = context.params.uid;
    const afterData = change.after.exists ? change.after.data() : null;
    if (!afterData) {
        // Document deleted - claims will become irrelevant once Auth record is deleted
        return null;
    }
    const role = afterData.role || 'kid';
    const parentId = afterData.linkedParentId || null;
    const isAdmin = role === 'admin' || afterData.isAdmin === true;
    try {
        const userRecord = await admin.auth().getUser(uid).catch(() => null);
        if (!userRecord) {
            // Auth user might not exist yet if created as a local child profile
            return null;
        }
        const existingClaims = userRecord.customClaims || {};
        if (existingClaims.role === role &&
            existingClaims.parentId === parentId &&
            existingClaims.admin === isAdmin) {
            // No changes needed
            return null;
        }
        await admin.auth().setCustomUserClaims(uid, {
            ...existingClaims,
            role,
            parentId,
            admin: isAdmin,
        });
        console.log(`[syncUserCustomClaims] Successfully synced custom claims for user ${uid}: role=${role}`);
        return null;
    }
    catch (error) {
        console.error(`[syncUserCustomClaims] Error syncing claims for user ${uid}:`, error);
        return null;
    }
});
/**
 * setUserRole Callable:
 * Allows a newly signed up user to select their initial account role ('parent' | 'teacher').
 * Child roles are created by parents, not standalone.
 * Once a role is set, it is IMMUTABLE by client.
 */
exports.setUserRole = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    const { role } = data;
    if (!role || !['parent', 'teacher'].includes(role)) {
        throw new functions.https.HttpsError('invalid-argument', 'Valid role is required ("parent" or "teacher"). Child accounts must be created by a parent.');
    }
    const uid = context.auth.uid;
    const db = admin.firestore();
    const userRef = db.collection('Users').doc(uid);
    const userSnap = await userRef.get();
    if (userSnap.exists && userSnap.data()?.role) {
        throw new functions.https.HttpsError('failed-precondition', 'User role has already been established and cannot be changed.');
    }
    // Update Firestore and set Auth Custom Claims
    await userRef.set({
        role,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    await admin.auth().setCustomUserClaims(uid, {
        role,
        admin: false,
    });
    return { success: true, role };
});
//# sourceMappingURL=syncUserCustomClaims.js.map