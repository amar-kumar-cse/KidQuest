"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateLevel = calculateLevel;
exports.xpToNextLevel = xpToNextLevel;
// XP thresholds for each level (index = level - 1)
const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000];
function calculateLevel(totalXp) {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (totalXp >= LEVEL_THRESHOLDS[i])
            return i + 1;
    }
    return 1;
}
function xpToNextLevel(totalXp) {
    const level = calculateLevel(totalXp);
    const current = totalXp - (LEVEL_THRESHOLDS[level - 1] ?? 0);
    const required = (LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]) -
        (LEVEL_THRESHOLDS[level - 1] ?? 0);
    return { current, required, level };
}
//# sourceMappingURL=xp.js.map