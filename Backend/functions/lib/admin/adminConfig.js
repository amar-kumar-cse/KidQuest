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
exports.getAdminConfig = getAdminConfig;
const admin = __importStar(require("firebase-admin"));
async function getAdminConfig(db) {
    const _db = db || admin.firestore();
    try {
        const doc = await _db.collection('adminConfig').doc('main').get();
        if (!doc.exists)
            return { MAX_ACTIVE_TASKS: 10, INACTIVITY_DAYS: 2, AI_CONFIDENCE_THRESHOLD: 0.9 };
        const data = doc.data();
        return {
            MAX_ACTIVE_TASKS: typeof data?.MAX_ACTIVE_TASKS === 'number' ? data.MAX_ACTIVE_TASKS : 10,
            INACTIVITY_DAYS: typeof data?.INACTIVITY_DAYS === 'number' ? data.INACTIVITY_DAYS : 2,
            AI_CONFIDENCE_THRESHOLD: typeof data?.AI_CONFIDENCE_THRESHOLD === 'number' ? data.AI_CONFIDENCE_THRESHOLD : 0.9,
        };
    }
    catch (err) {
        console.warn('Failed to read adminConfig, falling back to defaults', err && err.toString());
        return { MAX_ACTIVE_TASKS: 10, INACTIVITY_DAYS: 2, AI_CONFIDENCE_THRESHOLD: 0.9 };
    }
}
//# sourceMappingURL=adminConfig.js.map