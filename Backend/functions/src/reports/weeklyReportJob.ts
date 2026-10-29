import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { generateWeeklyPdfBuffer, ChildWeeklyReportData, SubjectStatRow } from './generateWeeklyPdf';
import { sendWeeklyReportEmail } from './emailService';

/**
 * Aggregates a child's last 7 days of activity and sends the PDF report email.
 */
export async function processChildWeeklyReport(
  childId: string,
  parentName: string,
  parentEmail: string,
  db: admin.firestore.Firestore
): Promise<{ success: boolean; childName: string; stats?: ChildWeeklyReportData }> {
  // 1. Fetch child profile
  const childSnap = await db.collection('Users').doc(childId).get();
  const childData = childSnap.exists ? childSnap.data() || {} : {};
  const childName = childData.name || 'Champion';

  // 2. Compute date boundaries for the past 7 days
  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const weekStart = `${monthNames[sevenDaysAgo.getMonth()]} ${sevenDaysAgo.getDate()}`;
  const weekEnd = `${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  // 3. Query tasks completed or created in last 7 days
  let tasksSnap;
  try {
    tasksSnap = await db
      .collection('tasks')
      .where('userId', '==', childId)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(sevenDaysAgo))
      .get();
  } catch (e) {
    // Fallback if composite index is not yet built
    tasksSnap = await db.collection('tasks').where('userId', '==', childId).get();
  }

  let totalTasks = 0;
  let completedTasks = 0;
  let xpEarnedThisWeek = 0;
  const subjectMap = new Map<string, { total: number; completed: number; missed: number }>();

  for (const doc of tasksSnap.docs) {
    const t = doc.data();
    const taskCreated = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt || 0);

    // If using fallback query, filter in-memory to 7 days
    if (taskCreated < sevenDaysAgo) continue;

    totalTasks++;
    const isDone = t.status === 'done' || t.status === 'completed';
    const subject = (t.subject || t.category || 'General').trim();

    if (isDone) {
      completedTasks++;
      const xpVal = Number(t.finalXp || t.xp || 10);
      xpEarnedThisWeek += xpVal;
    }

    const current = subjectMap.get(subject) || { total: 0, completed: 0, missed: 0 };
    current.total++;
    if (isDone) {
      current.completed++;
    } else {
      current.missed++;
    }
    subjectMap.set(subject, current);
  }

  // 4. Build subject breakdown rows
  const subjects: SubjectStatRow[] = Array.from(subjectMap.entries()).map(([subj, s]) => ({
    subject: subj,
    total: s.total,
    completed: s.completed,
    missed: s.missed,
    rate: s.total > 0 ? (s.completed / s.total) * 100 : 0,
  }));

  // Sort subjects: highest completion rate first
  subjects.sort((a, b) => b.rate - a.rate);

  const bestSubject = subjects.length > 0 ? subjects[0].subject : 'Consistent across subjects';
  const weakSubjects = subjects.filter((s) => s.rate < 70 || s.missed > 0);
  const weakestSubject = weakSubjects.length > 0
    ? weakSubjects[weakSubjects.length - 1].subject
    : 'None, great balance!';

  // 5. Fetch streaks & rewards
  const [streakSnap, rewardSnap] = await Promise.all([
    db.collection('streaks').doc(childId).get(),
    db.collection('rewards').doc(childId).get(),
  ]);

  const streakData = streakSnap.exists ? streakSnap.data() || {} : {};
  const rewardData = rewardSnap.exists ? rewardSnap.data() || {} : {};

  const currentStreak = Number(streakData.currentStreak || 0);
  const longestStreak = Number(streakData.longestStreak || streakData.bestStreak || currentStreak);
  const currentLevel = Number(rewardData.level || 1);
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const reportData: ChildWeeklyReportData = {
    childName,
    parentName,
    weekStart,
    weekEnd,
    totalTasks,
    completedTasks,
    completionRate,
    currentStreak,
    longestStreak,
    xpEarnedThisWeek,
    currentLevel,
    bestSubject,
    weakestSubject,
    subjects,
  };

  // 6. Generate PDF Buffer via pdfkit
  const pdfBuffer = await generateWeeklyPdfBuffer(reportData);

  // 7. Send email with PDF attachment
  await sendWeeklyReportEmail({
    to: parentEmail,
    parentName,
    childName,
    weekStart,
    weekEnd,
    stats: reportData,
    pdfBuffer,
  });

  return { success: true, childName, stats: reportData };
}

/**
 * Iterates through all children for a parent and sends their reports.
 */
export async function generateAndSendReportsForParent(
  parentId: string,
  db: admin.firestore.Firestore
): Promise<{ sentCount: number; children: string[] }> {
  const parentSnap = await db.collection('Users').doc(parentId).get();
  if (!parentSnap.exists) {
    throw new Error('Parent not found.');
  }

  const parent = parentSnap.data() || {};
  if (parent.weeklyReportEnabled === false) {
    console.log(`[weeklyReport] Parent ${parentId} has opted out of weekly reports.`);
    return { sentCount: 0, children: [] };
  }

  const parentEmail = parent.email;
  if (!parentEmail) {
    console.warn(`[weeklyReport] Parent ${parentId} has no email address.`);
    return { sentCount: 0, children: [] };
  }

  const parentName = parent.name || 'Parent';
  const childIds: string[] = Array.isArray(parent.parentOf)
    ? parent.parentOf
    : Array.isArray(parent.linkedKids)
    ? parent.linkedKids
    : [];

  if (childIds.length === 0) {
    console.log(`[weeklyReport] No children linked to parent ${parentId}.`);
    return { sentCount: 0, children: [] };
  }

  const processedChildren: string[] = [];

  for (const childId of childIds) {
    try {
      const res = await processChildWeeklyReport(childId, parentName, parentEmail, db);
      processedChildren.push(res.childName);
    } catch (err) {
      console.error(`[weeklyReport] Failed processing child ${childId}:`, err);
    }
  }

  return { sentCount: processedChildren.length, children: processedChildren };
}

/**
 * 1. Firebase Scheduled Cloud Function:
 * Runs every Sunday at 8:00 AM IST ('0 8 * * 0' in 'Asia/Kolkata')
 */
export const weeklyProgressReportCron = functions
  .region('asia-south1')
  .pubsub.schedule('0 8 * * 0')
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    console.log('[weeklyProgressReportCron] Starting automated Sunday 8:00 AM IST report job...');
    const db = admin.firestore();

    // Query all parents who haven't opted out
    const parentsSnap = await db.collection('Users').where('role', '==', 'parent').get();

    let totalSent = 0;
    for (const doc of parentsSnap.docs) {
      const parentData = doc.data();
      // Opt-out check
      if (parentData.weeklyReportEnabled === false) {
        continue;
      }

      try {
        const result = await generateAndSendReportsForParent(doc.id, db);
        totalSent += result.sentCount;
      } catch (err) {
        console.error(`[weeklyProgressReportCron] Error generating reports for parent ${doc.id}:`, err);
      }
    }

    console.log(`[weeklyProgressReportCron] Completed. Successfully dispatched ${totalSent} reports.`);
    return null;
  });
