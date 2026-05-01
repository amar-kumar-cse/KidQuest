import * as admin from 'firebase-admin';
admin.initializeApp();

// Export all callable functions
export { approveTask } from './tasks/approveTask';
export { rejectTask } from './tasks/rejectTask';
export { processTaskApproval } from './tasks/processTaskApproval';
export { suggestTasks } from './ai/suggestTasks';
export { verifyProof } from './ai/verifyProof';
export { completeTaskTransaction } from './tasks/completeTaskTransaction';

// Export reward functions
export { claimReward } from './rewards/claimReward';

// Export family functions
export { verifyFamilyCode } from './family/verifyFamilyCode';

// Scheduled
export { resetDailyStreaks } from './scheduled/resetDailyStreaks';
export { sendInactivityNudges } from './scheduled/sendInactivityNudges';

// Export Firestore trigger functions
export { onTaskSubmitted } from './notifications/onTaskSubmitted';
export { onTaskApproved } from './notifications/onTaskApproved';

// Export user trigger functions
export { onUserDeleted } from './users/onUserDeleted';
export { deleteAccount } from './users/deleteAccount';
export { processDeletionJob } from './users/processDeletionJob';
