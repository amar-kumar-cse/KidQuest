import * as admin from 'firebase-admin';
admin.initializeApp();

// Export all callable functions
export { approveTask } from './tasks/approveTask';
export { rejectTask } from './tasks/rejectTask';

// Export reward functions
export { claimReward } from './rewards/claimReward';

// Export family functions
export { verifyFamilyCode } from './family/verifyFamilyCode';

// Export Firestore trigger functions
export { onTaskSubmitted } from './notifications/onTaskSubmitted';
export { onTaskApproved } from './notifications/onTaskApproved';

// Export user trigger functions
export { onUserDeleted } from './users/onUserDeleted';
