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
exports.deleteAccount = exports.onUserDeleted = exports.onTaskApproved = exports.onTaskSubmitted = exports.sendInactivityNudges = exports.resetDailyStreaks = exports.verifyFamilyCode = exports.claimReward = exports.completeTaskTransaction = exports.verifyProof = exports.suggestTasks = exports.processTaskApproval = exports.rejectTask = exports.approveTask = void 0;
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
// Export all callable functions
var approveTask_1 = require("./tasks/approveTask");
Object.defineProperty(exports, "approveTask", { enumerable: true, get: function () { return approveTask_1.approveTask; } });
var rejectTask_1 = require("./tasks/rejectTask");
Object.defineProperty(exports, "rejectTask", { enumerable: true, get: function () { return rejectTask_1.rejectTask; } });
var processTaskApproval_1 = require("./tasks/processTaskApproval");
Object.defineProperty(exports, "processTaskApproval", { enumerable: true, get: function () { return processTaskApproval_1.processTaskApproval; } });
var suggestTasks_1 = require("./ai/suggestTasks");
Object.defineProperty(exports, "suggestTasks", { enumerable: true, get: function () { return suggestTasks_1.suggestTasks; } });
var verifyProof_1 = require("./ai/verifyProof");
Object.defineProperty(exports, "verifyProof", { enumerable: true, get: function () { return verifyProof_1.verifyProof; } });
var completeTaskTransaction_1 = require("./tasks/completeTaskTransaction");
Object.defineProperty(exports, "completeTaskTransaction", { enumerable: true, get: function () { return completeTaskTransaction_1.completeTaskTransaction; } });
// Export reward functions
var claimReward_1 = require("./rewards/claimReward");
Object.defineProperty(exports, "claimReward", { enumerable: true, get: function () { return claimReward_1.claimReward; } });
// Export family functions
var verifyFamilyCode_1 = require("./family/verifyFamilyCode");
Object.defineProperty(exports, "verifyFamilyCode", { enumerable: true, get: function () { return verifyFamilyCode_1.verifyFamilyCode; } });
// Scheduled
var resetDailyStreaks_1 = require("./scheduled/resetDailyStreaks");
Object.defineProperty(exports, "resetDailyStreaks", { enumerable: true, get: function () { return resetDailyStreaks_1.resetDailyStreaks; } });
var sendInactivityNudges_1 = require("./scheduled/sendInactivityNudges");
Object.defineProperty(exports, "sendInactivityNudges", { enumerable: true, get: function () { return sendInactivityNudges_1.sendInactivityNudges; } });
// Export Firestore trigger functions
var onTaskSubmitted_1 = require("./notifications/onTaskSubmitted");
Object.defineProperty(exports, "onTaskSubmitted", { enumerable: true, get: function () { return onTaskSubmitted_1.onTaskSubmitted; } });
var onTaskApproved_1 = require("./notifications/onTaskApproved");
Object.defineProperty(exports, "onTaskApproved", { enumerable: true, get: function () { return onTaskApproved_1.onTaskApproved; } });
// Export user trigger functions
var onUserDeleted_1 = require("./users/onUserDeleted");
Object.defineProperty(exports, "onUserDeleted", { enumerable: true, get: function () { return onUserDeleted_1.onUserDeleted; } });
var deleteAccount_1 = require("./users/deleteAccount");
Object.defineProperty(exports, "deleteAccount", { enumerable: true, get: function () { return deleteAccount_1.deleteAccount; } });
//# sourceMappingURL=index.js.map