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
exports.verifyFamilyCode = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
/**
 * Verify a family code server-side (prevents enumeration attacks from client).
 * Links the kid (caller) to the parent identified by the code.
 */
exports.verifyFamilyCode = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
    }
    const { code } = data;
    if (!code || typeof code !== 'string' || code.length !== 6) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid family code format.');
    }
    const db = admin.firestore();
    const codeSnap = await db
        .collection('FamilyCodes')
        .doc(code.toUpperCase().trim())
        .get();
    if (!codeSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Family code not found. Please check and try again.');
    }
    const codeData = codeSnap.data();
    // Check expiry
    const expiresAt = codeData.expiresAt?.toDate?.() ?? new Date(0);
    if (expiresAt < new Date()) {
        throw new functions.https.HttpsError('failed-precondition', 'This family code has expired. Ask your parent to generate a new one.');
    }
    const parentId = codeData.parentId;
    const kidId = context.auth.uid;
    // Prevent re-linking if already linked
    const kidSnap = await db.collection('Users').doc(kidId).get();
    const kidData = kidSnap.data();
    if (kidData.linkedParentId && kidData.linkedParentId === parentId) {
        throw new functions.https.HttpsError('already-exists', 'You are already linked to this parent.');
    }
    // Atomically link kid ↔ parent
    await db.runTransaction(async (tx) => {
        const parentRef = db.collection('Users').doc(parentId);
        const kidRef = db.collection('Users').doc(kidId);
        const codeRef = db.collection('FamilyCodes').doc(code.toUpperCase().trim());
        // Re-read inside transaction
        const [parentSnap, kidSnap, codeSnap] = await Promise.all([
            tx.get(parentRef),
            tx.get(kidRef),
            tx.get(codeRef),
        ]);
        if (!parentSnap.exists)
            throw new functions.https.HttpsError('not-found', 'Parent not found.');
        if (!kidSnap.exists)
            throw new functions.https.HttpsError('not-found', 'Kid profile not found.');
        if (!codeSnap.exists)
            throw new functions.https.HttpsError('not-found', 'Family code no longer exists.');
        const codeDoc = codeSnap.data();
        if (codeDoc.usedAt)
            throw new functions.https.HttpsError('failed-precondition', 'Family code already used.');
        const familyId = codeDoc.familyId;
        // Link kid -> family, link parent -> family, add linkedKids, and mark code used
        tx.update(kidRef, {
            linkedParentId: parentId,
            familyId: familyId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.update(parentRef, {
            linkedKids: admin.firestore.FieldValue.arrayUnion(kidId),
            familyId: familyId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.update(codeRef, {
            usedAt: admin.firestore.FieldValue.serverTimestamp(),
            usedBy: kidId,
        });
    });
    // Fetch parent name to return to UI
    const parentSnap = await db.collection('Users').doc(parentId).get();
    const parentName = parentSnap.data()?.name ?? 'Your Parent';
    return { success: true, parentName };
});
//# sourceMappingURL=verifyFamilyCode.js.map