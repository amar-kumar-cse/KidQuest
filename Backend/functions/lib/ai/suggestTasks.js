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
exports.suggestTasks = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
/**
 * suggestTasks callable function (Phase 4 AI Integration)
 * - Params: { age, contextText, childUid, limit }
 * - Uses Gemini 1.5 Flash API if GEMINI_API_KEY is configured
 * - Seamless heuristic fallback if key is not configured or network fails
 */
exports.suggestTasks = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to request task suggestions.');
    }
    const { age = 8, contextText, childUid, limit = 5 } = data;
    const safeAge = typeof age === 'number' ? Math.max(3, Math.min(age, 17)) : 8;
    const max = Math.min(10, Math.max(1, limit));
    const db = admin.firestore();
    const callerUid = context.auth.uid;
    const callerRef = db.collection('Users').doc(callerUid);
    const callerSnap = await callerRef.get();
    if (!callerSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Caller user profile not found.');
    }
    const caller = callerSnap.data() || {};
    const isAdmin = caller.role === 'admin' || context.auth.token.admin === true;
    if (caller.role !== 'parent' && !isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Only parents or teachers can request task suggestions.');
    }
    // Family / linkage check if childUid is provided
    if (childUid) {
        const childSnap = await db.collection('Users').doc(childUid).get();
        if (!childSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Child profile not found.');
        }
        const child = childSnap.data() || {};
        const isLinked = (Array.isArray(caller.linkedKids) && caller.linkedKids.includes(childUid)) ||
            child.linkedParentId === callerUid ||
            (caller.familyId && child.familyId && caller.familyId === child.familyId) ||
            isAdmin;
        if (!isLinked) {
            throw new functions.https.HttpsError('permission-denied', 'Child is not linked to your family.');
        }
    }
    const apiKey = process.env.GEMINI_API_KEY;
    let suggestions = [];
    // 1. If Gemini API key is present, invoke Google Generative Language REST API
    if (apiKey) {
        try {
            const prompt = `You are a helpful parenting assistant for a kids chore and learning app called KidQuest.
Generate ${max} creative, age-appropriate, positive tasks for a ${safeAge}-year-old child in India.
Context or parent request: "${contextText || 'daily chores, reading, and healthy habits'}".
Return ONLY valid JSON array with each object having keys:
- "title": short action title (under 50 chars)
- "description": positive 1-line guidance (under 120 chars)
- "category": one of ["homework", "chores", "reading", "exercise", "creative", "kindness"]
- "xp": integer reward (15 to 50)`;
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            const resp = await axios_1.default.post(endpoint, {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 600,
                    responseMimeType: 'application/json',
                },
            }, { timeout: 12000 });
            const rawText = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
                const parsed = JSON.parse(rawText);
                if (Array.isArray(parsed)) {
                    suggestions = parsed.slice(0, max).map((item) => ({
                        title: String(item.title || 'Helpful Task').slice(0, 100),
                        description: String(item.description || '').slice(0, 200),
                        category: ['homework', 'chores', 'reading', 'exercise', 'creative', 'kindness'].includes(item.category)
                            ? item.category
                            : 'chores',
                        xp: typeof item.xp === 'number' && item.xp >= 5 ? Math.min(item.xp, 100) : 25,
                    }));
                }
            }
        }
        catch (apiErr) {
            console.warn('[suggestTasks] Gemini API call failed, falling back to heuristics:', apiErr);
        }
    }
    // 2. Fallback heuristic suggestions (if no API key or API call failed)
    if (suggestions.length === 0) {
        const ageAppropriateHeuristics = [
            { title: 'Tidy Study Desk', description: 'Arrange your books, pens and clean study area.', category: 'chores', xp: 20 },
            { title: 'Read Hindi/English Storybook', description: 'Read 2 chapters or for 20 minutes.', category: 'reading', xp: 30 },
            { title: 'Morning Exercise & Stretching', description: 'Do 10 jumping jacks and morning stretch.', category: 'exercise', xp: 25 },
            { title: 'Water the Houseplants', description: 'Help care for plants in your balcony or garden.', category: 'chores', xp: 15 },
            { title: 'Help Set Dinner Table', description: 'Place plates and glasses before the meal.', category: 'kindness', xp: 20 },
            { title: 'Math Worksheet Practice', description: 'Solve 5 math problems or practice tables.', category: 'homework', xp: 35 },
            { title: 'Fold Clean Clothes', description: 'Neatly fold your school uniform or t-shirts.', category: 'chores', xp: 20 },
        ];
        suggestions = ageAppropriateHeuristics.slice(0, max);
    }
    return { success: true, suggestions };
});
//# sourceMappingURL=suggestTasks.js.map