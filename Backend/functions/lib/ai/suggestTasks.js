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
const adminConfig_1 = require("../admin/adminConfig");
/**
 * suggestTasks callable
 * Params: { age, contextText, childUid, limit }
 * Only parents may call this. Uses Gemini API if configured, otherwise falls back to heuristics.
 */
exports.suggestTasks = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
    const { age, contextText, childUid, limit = 5 } = data;
    if (typeof age !== 'number')
        throw new functions.https.HttpsError('invalid-argument', 'age (number) is required');
    const db = admin.firestore();
    const callerRef = db.collection('Users').doc(context.auth.uid);
    const callerSnap = await callerRef.get();
    if (!callerSnap.exists)
        throw new functions.https.HttpsError('not-found', 'Caller not found');
    const caller = callerSnap.data();
    if (caller.role !== 'parent')
        throw new functions.https.HttpsError('permission-denied', 'Only parents may request suggestions');
    // Family check if childUid provided
    if (childUid) {
        const childSnap = await db.collection('Users').doc(childUid).get();
        if (!childSnap.exists)
            throw new functions.https.HttpsError('not-found', 'Child not found');
        const child = childSnap.data();
        if (child.familyId !== caller.familyId)
            throw new functions.https.HttpsError('permission-denied', 'Child not in same family');
    }
    const apiKey = process.env.GEMINI_API_KEY;
    await (0, adminConfig_1.getAdminConfig)(db); // ensure adminConfig exists; not required here but keep warm cache
    const max = Math.min(10, Math.max(1, limit));
    let suggestions = [];
    if (!apiKey) {
        // Fallback heuristic suggestions
        const base = [
            'Tidy your study desk for 15 minutes',
            'Help set the table for dinner',
            'Read for 20 minutes',
            'Water the plants in the garden',
            'Sort and fold your clothes',
            'Help clear dishes after meal',
            'Practice handwriting for 10 minutes',
            'Organize your toy shelf',
            'Take out the trash with a parent',
            'Help prepare a simple snack',
        ];
        for (let i = 0; i < max; i++) {
            const title = base[i % base.length];
            suggestions.push({ title, description: `${title} — suitable for age ${age}`, xp: 5 + (age % 5) });
        }
    }
    else {
        try {
            const prompt = `Generate ${max} short child-friendly tasks for a child of age ${age}. Keep each suggestion concise (title and one-line description). Consider: ${contextText || 'general activities'}. Return as JSON array of objects with title and description.`;
            const resp = await axios_1.default.post('https://api.example.com/v1/generate', { prompt, maxResults: max }, { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 15000 });
            const out = resp.data?.suggestions || resp.data?.result || resp.data;
            if (Array.isArray(out)) {
                suggestions = out.slice(0, max).map((s) => ({ title: s.title || s.text || String(s).slice(0, 80), description: s.description || s.text || '', xp: 5 }));
            }
            else if (typeof out === 'string') {
                // try to parse JSON
                try {
                    const parsed = JSON.parse(out);
                    if (Array.isArray(parsed))
                        suggestions = parsed.slice(0, max).map((s) => ({ title: s.title || s.text, description: s.description || '', xp: 5 }));
                }
                catch (e) {
                    // fallback to splitting lines
                    const lines = out.split('\n').filter((l) => l.trim()).slice(0, max);
                    suggestions = lines.map((l) => ({ title: l.trim().slice(0, 80), description: '', xp: 5 }));
                }
            }
        }
        catch (err) {
            console.warn('AI suggestTasks failed:', err && err.toString());
            // fallback to heuristic
            const base = ['Tidy your study desk', 'Read for 20 minutes', 'Water the plants', 'Help set the table', 'Organize toys'];
            for (let i = 0; i < max; i++)
                suggestions.push({ title: `${base[i % base.length]} (AI-fallback)`, description: '', xp: 5 });
        }
    }
    // Persist suggestions
    try {
        const now = admin.firestore.Timestamp.now();
        const docRef = db.collection('AISuggestions').doc();
        await docRef.set({ suggestions, requestedBy: context.auth.uid, childUid: childUid || null, createdAt: now, familyId: caller.familyId });
    }
    catch (e) {
        console.warn('Failed to persist AISuggestions', e && e.toString());
    }
    return { success: true, suggestions };
});
//# sourceMappingURL=suggestTasks.js.map