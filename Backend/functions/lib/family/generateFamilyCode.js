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
exports.generateFamilyCode = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
/**
 * generateFamilyCode callable
 * - Generates a secure, 6-character alphanumeric invite code.
 * - Enforces that only parents can generate a code.
 * - Stores the code in Firestore with a 24-hour expiry and links it to the parent's familyId.
 */
exports.generateFamilyCode = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
    }
    const db = admin.firestore();
    const parentUid = context.auth.uid;
    const parentRef = db.collection('Users').doc(parentUid);
    const parentSnap = await parentRef.get();
    if (!parentSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Parent profile not found.');
    }
    const parentData = parentSnap.data();
    if (parentData.role !== 'parent') {
        throw new functions.https.HttpsError('permission-denied', 'Only parents can generate invite codes.');
    }
    // Ensure parent has a familyId (create one if they somehow don't)
    let familyId = parentData.familyId;
    if (!familyId) {
        familyId = parentUid; // Fallback to parent's UID as family ID
        await parentRef.update({ familyId });
    }
    // Generate a random 6-character code avoiding ambiguous characters
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour expiry
    await db.collection('FamilyCodes').doc(code).set({
        parentId: parentUid,
        familyId: familyId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    });
    return { success: true, code };
});
//# sourceMappingURL=generateFamilyCode.js.map