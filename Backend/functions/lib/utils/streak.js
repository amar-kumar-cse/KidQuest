"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStreak = updateStreak;
function updateStreak(lastActivityDate, currentStreak, bestStreak) {
    const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD' in UTC
    if (!lastActivityDate) {
        const newStreak = 1;
        return { currentStreak: newStreak, bestStreak: Math.max(newStreak, bestStreak), today };
    }
    const last = new Date(lastActivityDate);
    const now = new Date(today);
    const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    let newStreak;
    if (diffDays === 0) {
        // Already active today — keep current streak
        newStreak = currentStreak;
    }
    else if (diffDays === 1) {
        // Consecutive day — increment
        newStreak = currentStreak + 1;
    }
    else {
        // Streak broken — reset to 1
        newStreak = 1;
    }
    return {
        currentStreak: newStreak,
        bestStreak: Math.max(newStreak, bestStreak),
        today,
    };
}
//# sourceMappingURL=streak.js.map