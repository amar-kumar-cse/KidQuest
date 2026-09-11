import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface TaskRecord {
  id: string;
  userId: string;
  title: string;
  subject?: string;
  status: 'pending' | 'done' | 'completed' | 'missed' | 'rejected';
  dueDate?: any;
  completedAt?: any;
  createdAt?: any;
}

export interface SubjectStats {
  subject: string;
  total: number;
  completed: number;
  missedOrPending: number;
  completionRate: number; // 0.0 - 1.0
}

export interface AggregationResult {
  totalTasks: number;
  completedTasks: number;
  subjectStats: SubjectStats[];
  weakSubjects: string[];
  bestHour: number | null; // 0 - 23
  bestStudyTimeLabel: string;
}

export interface StudySuggestionsResult {
  weakSubjects: string[];
  bestStudyTime: string;
  todaySuggestion: string;
  motivationalMsg: string;
  updatedAt?: any;
}

// ─── Data Aggregation Logic ───────────────────────────────────────────────────

/**
 * Aggregates task completion rates by subject and finds peak hour of completion.
 */
export function aggregateTaskMetrics(tasks: TaskRecord[]): AggregationResult {
  const subjectMap = new Map<string, { total: number; completed: number; missed: number }>();
  const hourCounts = new Array(24).fill(0);
  let totalTasks = 0;
  let completedTasks = 0;

  for (const task of tasks) {
    totalTasks++;
    const subject = (task.subject || 'General').trim();
    const isCompleted = task.status === 'done' || task.status === 'completed';

    // 1. Subject metrics
    const stats = subjectMap.get(subject) || { total: 0, completed: 0, missed: 0 };
    stats.total++;
    if (isCompleted) {
      stats.completed++;
      completedTasks++;
    } else {
      stats.missed++;
    }
    subjectMap.set(subject, stats);

    // 2. Hour of day analysis for completed tasks
    if (isCompleted && task.completedAt) {
      try {
        let date: Date | null = null;
        if (typeof task.completedAt.toDate === 'function') {
          date = task.completedAt.toDate();
        } else if (task.completedAt instanceof Date) {
          date = task.completedAt;
        } else if (typeof task.completedAt === 'string' || typeof task.completedAt === 'number') {
          date = new Date(task.completedAt);
        }

        if (date && !isNaN(date.getTime())) {
          const hour = date.getHours(); // Local hour
          if (hour >= 0 && hour <= 23) {
            hourCounts[hour]++;
          }
        }
      } catch (e) {
        // Skip invalid date
      }
    }
  }

  // Calculate subject completion rates
  const subjectStats: SubjectStats[] = Array.from(subjectMap.entries()).map(([subject, data]) => ({
    subject,
    total: data.total,
    completed: data.completed,
    missedOrPending: data.missed,
    completionRate: data.total > 0 ? data.completed / data.total : 0,
  }));

  // Identify weak subjects (completion rate < 70% or subjects with 2+ missed tasks, sorted worst first)
  const weakSubjects = subjectStats
    .filter((s) => s.completionRate < 0.7 || s.missedOrPending >= 2)
    .sort((a, b) => a.completionRate - b.completionRate || b.missedOrPending - a.missedOrPending)
    .map((s) => s.subject);

  // Identify best hour of the day
  let bestHour: number | null = null;
  let maxCompletions = 0;
  for (let h = 0; h < 24; h++) {
    if (hourCounts[h] > maxCompletions) {
      maxCompletions = hourCounts[h];
      bestHour = h;
    }
  }

  // Format best study time label
  let bestStudyTimeLabel = 'Around 4:30 PM (afternoon focus time)';
  if (bestHour !== null && maxCompletions > 0) {
    const period = bestHour >= 12 ? 'PM' : 'AM';
    const displayHour = bestHour % 12 === 0 ? 12 : bestHour % 12;
    bestStudyTimeLabel = `Around ${displayHour}:00 ${period} (your peak focus zone)`;
  }

  return {
    totalTasks,
    completedTasks,
    subjectStats,
    weakSubjects,
    bestHour,
    bestStudyTimeLabel,
  };
}

// ─── Heuristic Fallback Generator ─────────────────────────────────────────────

export function generateFallbackSuggestions(
  metrics: AggregationResult,
  childName: string = 'Champion'
): StudySuggestionsResult {
  const weakList = metrics.weakSubjects.length > 0 ? metrics.weakSubjects : ['General Practice'];
  const primaryWeak = weakList[0] || 'your daily quest';

  return {
    weakSubjects: weakList,
    bestStudyTime: metrics.bestStudyTimeLabel,
    todaySuggestion: `Dedicate 15 minutes to ${primaryWeak} today before diving into games! 📚`,
    motivationalMsg: `Keep rocking, ${childName}! Tackling ${primaryWeak} step-by-step turns everyday routines into legendary wins! ⚔️🌟`,
  };
}

// ─── Cloud Function Implementation ───────────────────────────────────────────

export const generateStudySuggestions = functions
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
    }

    const db = admin.firestore();
    const callerUid = context.auth.uid;
    const targetUserId = data?.userId || callerUid;

    // Permissions check: caller must be the user, an admin, or their parent
    if (targetUserId !== callerUid) {
      const callerDoc = await db.collection('users').doc(callerUid).get();
      const callerData = callerDoc.data() || {};
      const isAdmin = callerData.role === 'admin';
      const isParentOfChild =
        callerData.role === 'parent' &&
        Array.isArray(callerData.parentOf) &&
        callerData.parentOf.includes(targetUserId);

      if (!isAdmin && !isParentOfChild) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Not authorized to generate suggestions for this user.'
        );
      }
    }

    // 1. Fetch child profile for personalization
    let childName = 'Champion';
    const userDoc = await db.collection('users').doc(targetUserId).get();
    if (userDoc.exists) {
      childName = userDoc.data()?.name || 'Champion';
    }

    // 2. Query last 30 days of tasks for target user
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let tasksSnapshot;
    try {
      // Query tasks collection
      tasksSnapshot = await db
        .collection('tasks')
        .where('userId', '==', targetUserId)
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
        .get();
    } catch (err) {
      // Fallback query if composite index is pending
      tasksSnapshot = await db
        .collection('tasks')
        .where('userId', '==', targetUserId)
        .get();
    }

    // Also check legacy 'Tasks' collection if 'tasks' is empty
    if (tasksSnapshot.empty) {
      try {
        tasksSnapshot = await db
          .collection('Tasks')
          .where('assignedToUid', '==', targetUserId)
          .get();
      } catch (e) {
        // ignore
      }
    }

    const tasks: TaskRecord[] = tasksSnapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        userId: d.userId || d.assignedToUid || targetUserId,
        title: d.title || 'Untitled Task',
        subject: d.subject || d.category || 'General',
        status: d.status || 'pending',
        dueDate: d.dueDate,
        completedAt: d.completedAt,
        createdAt: d.createdAt,
      };
    });

    // 3. Compute Metrics
    const metrics = aggregateTaskMetrics(tasks);

    // 4. Call Google Gemini API (gemini-1.5-flash)
    const apiKey = process.env.GEMINI_API_KEY;
    let finalSuggestions: StudySuggestionsResult;

    if (!apiKey) {
      console.log('No GEMINI_API_KEY configured. Using heuristic generator.');
      finalSuggestions = generateFallbackSuggestions(metrics, childName);
    } else {
      try {
        const statsSummary = metrics.subjectStats
          .map(
            (s) =>
              `- ${s.subject}: ${s.completed}/${s.total} completed (${Math.round(
                s.completionRate * 100
              )}%), ${s.missedOrPending} missed/pending`
          )
          .join('\n');

        const prompt = `You are a warm, encouraging, and gamified AI study coach for a kid named ${childName} in the KidQuest app.
Analyze their 30-day task completion stats:

SUBJECT BREAKDOWN:
${statsSummary || 'No subject tasks logged yet. Provide general encouraging study habits.'}

TIME OF DAY PATTERNS:
Peak completion hour: ${metrics.bestStudyTimeLabel}

INSTRUCTIONS:
1. Identify the 1-3 subjects that need the most practice or encouragement (weakSubjects).
2. Recommend the optimal study time of day based on their completion habit (bestStudyTime).
3. Provide a clear, fun, 1-sentence action for today (todaySuggestion).
4. Provide an uplifting, energetic motivational message using kid-friendly gaming themes (motivationalMsg).

Return strictly a JSON object with this exact schema:
{
  "weakSubjects": string[],
  "bestStudyTime": string,
  "todaySuggestion": string,
  "motivationalMsg": string
}`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const geminiResp = await axios.post(
          geminiUrl,
          {
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.4,
            },
          },
          { timeout: 15000 }
        );

        const rawText = geminiResp.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = JSON.parse(rawText);

        finalSuggestions = {
          weakSubjects: Array.isArray(parsed.weakSubjects)
            ? parsed.weakSubjects
            : metrics.weakSubjects.length > 0
            ? metrics.weakSubjects
            : ['General Practice'],
          bestStudyTime: parsed.bestStudyTime || metrics.bestStudyTimeLabel,
          todaySuggestion:
            parsed.todaySuggestion ||
            `Spend 15 minutes on ${metrics.weakSubjects[0] || 'study time'} today!`,
          motivationalMsg:
            parsed.motivationalMsg ||
            `You're on your way to level up, ${childName}! Keep the streak alive! 🔥`,
        };
      } catch (err: any) {
        console.warn('Gemini API request failed, falling back to heuristics:', err?.message || err);
        finalSuggestions = generateFallbackSuggestions(metrics, childName);
      }
    }

    // 5. Save result to Firestore: suggestions/{userId}
    const suggestionDoc = {
      ...finalSuggestions,
      userId: targetUserId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('suggestions').doc(targetUserId).set(suggestionDoc, { merge: true });

    return {
      success: true,
      data: {
        ...finalSuggestions,
        updatedAt: new Date().toISOString(),
      },
    };
  });
