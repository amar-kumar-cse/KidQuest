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
exports.generateKidCustomToken = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
/**
 * generateKidCustomToken Callable
 * - Authenticated parent requests a custom Auth token for a specific kid.
 * - Used to generate a QR Code on the parent's device so the kid can scan and log in instantly.
 */
exports.generateKidCustomToken = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
    }
    const { kidUid } = data;
    if (!kidUid) {
        throw new functions.https.HttpsError('invalid-argument', 'kidUid is required.');
    }
    const callerUid = context.auth.uid;
    const db = admin.firestore();
    // Verify caller is a parent and child belongs to the same family
    const [callerSnap, kidSnap] = await Promise.all([
        db.collection('Users').doc(callerUid).get(),
        db.collection('Users').doc(kidUid).get(),
    ]);
    if (!callerSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Parent profile not found.');
    }
    if (!kidSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Kid profile not found.');
    }
    const caller = callerSnap.data();
    const kid = kidSnap.data();
    if (caller.role !== 'parent') {
        throw new functions.https.HttpsError('permission-denied', 'Only parents can generate custom tokens.');
    }
    // Cross-family security check
    const isLinked = (caller.linkedKids || []).includes(kidUid) || kid.linkedParentId === callerUid;
    const sameFamily = caller.familyId && caller.familyId === kid.familyId;
    if (!isLinked && !sameFamily) {
        throw new functions.https.HttpsError('permission-denied', 'Kid profile is not linked to your account.');
    }
    try {
        // Create Custom Firebase Auth Token for child user
        const customToken = await admin.auth().createCustomToken(kidUid);
        return { success: true, customToken };
    }
    catch (error) {
        console.error('Error creating custom token:', error);
        throw new functions.https.HttpsError('internal', `Failed to generate custom token: ${error.message}`);
    }
});
//# sourceMappingURL=generateKidCustomToken.js.map