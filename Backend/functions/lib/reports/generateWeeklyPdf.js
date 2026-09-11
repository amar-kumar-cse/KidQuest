"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWeeklyPdfBuffer = generateWeeklyPdfBuffer;
const pdfkit_1 = __importDefault(require("pdfkit"));
/**
 * Generates a single-page clean, modern PDF weekly progress report as a Buffer.
 */
async function generateWeeklyPdfBuffer(data) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new pdfkit_1.default({
                size: 'A4',
                margin: 36, // 0.5 inch margins
            });
            const buffers = [];
            doc.on('data', (chunk) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', (err) => reject(err));
            const pageWidth = doc.page.width;
            const contentWidth = pageWidth - 72; // 36 margin on each side
            // ─── 1. Header Banner ──────────────────────────────────────────────────
            doc.rect(36, 36, contentWidth, 70).fill('#1E1B4B'); // Deep Indigo
            doc.fillColor('#FCD34D').fontSize(22).font('Helvetica-Bold')
                .text('KidQuest', 52, 48, { continued: true });
            doc.fillColor('#E0E7FF').fontSize(12).font('Helvetica')
                .text('  |  Weekly Progress Report', { continued: false });
            doc.fillColor('#FFFFFF').fontSize(13).font('Helvetica-Bold')
                .text(`Student: ${data.childName}`, 52, 74, { continued: true });
            doc.fillColor('#A5B4FC').fontSize(10).font('Helvetica')
                .text(`   •   ${data.weekStart} – ${data.weekEnd}`, { align: 'right', width: contentWidth - 32 });
            // ─── 2. Top Summary KPI Cards ──────────────────────────────────────────
            const cardY = 118;
            const cardHeight = 65;
            const cardGap = 12;
            const cardWidth = (contentWidth - cardGap * 2) / 3;
            // Card 1: Completion Rate
            drawKpiCard(doc, 36, cardY, cardWidth, cardHeight, 'Completion Rate', `${Math.round(data.completionRate)}%`, `${data.completedTasks}/${data.totalTasks} Quests Done`, '#EEF2FF', '#4F46E5');
            // Card 2: Streak
            drawKpiCard(doc, 36 + cardWidth + cardGap, cardY, cardWidth, cardHeight, 'Current Streak', `${data.currentStreak} Days`, `Longest: ${data.longestStreak} Days`, '#FEF3C7', '#D97706');
            // Card 3: XP & Level
            drawKpiCard(doc, 36 + (cardWidth + cardGap) * 2, cardY, cardWidth, cardHeight, 'XP Earned', `+${data.xpEarnedThisWeek} XP`, `Level ${data.currentLevel} Adventurer`, '#ECFDF5', '#059669');
            // ─── 3. Subject Performance Breakdown Table ────────────────────────────
            const tableY = 196;
            doc.fillColor('#1E293B').fontSize(13).font('Helvetica-Bold')
                .text('Subject Performance Breakdown', 36, tableY);
            const headerY = tableY + 20;
            doc.rect(36, headerY, contentWidth, 22).fill('#F1F5F9');
            doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold');
            doc.text('SUBJECT', 46, headerY + 7);
            doc.text('TOTAL', 180, headerY + 7, { width: 55, align: 'center' });
            doc.text('COMPLETED', 240, headerY + 7, { width: 70, align: 'center' });
            doc.text('MISSED', 315, headerY + 7, { width: 55, align: 'center' });
            doc.text('RATE (%)', 375, headerY + 7, { width: 60, align: 'center' });
            doc.text('STATUS', 440, headerY + 7, { width: contentWidth - 410, align: 'center' });
            let currentY = headerY + 22;
            const rowHeight = 20;
            if (data.subjects.length === 0) {
                doc.rect(36, currentY, contentWidth, rowHeight).fill('#FFFFFF');
                doc.fillColor('#94A3B8').fontSize(9).font('Helvetica')
                    .text('No subject-specific tasks recorded for this week.', 46, currentY + 6);
                currentY += rowHeight;
            }
            else {
                data.subjects.forEach((subj, idx) => {
                    const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
                    doc.rect(36, currentY, contentWidth, rowHeight).fill(bg);
                    doc.fillColor('#1E293B').fontSize(9).font('Helvetica-Bold')
                        .text(subj.subject, 46, currentY + 6);
                    doc.fillColor('#64748B').fontSize(9).font('Helvetica')
                        .text(String(subj.total), 180, currentY + 6, { width: 55, align: 'center' });
                    doc.fillColor('#059669').fontSize(9).font('Helvetica-Bold')
                        .text(String(subj.completed), 240, currentY + 6, { width: 70, align: 'center' });
                    doc.fillColor(subj.missed > 0 ? '#DC2626' : '#64748B').fontSize(9).font('Helvetica')
                        .text(String(subj.missed), 315, currentY + 6, { width: 55, align: 'center' });
                    doc.fillColor('#1E293B').fontSize(9).font('Helvetica-Bold')
                        .text(`${Math.round(subj.rate)}%`, 375, currentY + 6, { width: 60, align: 'center' });
                    let badge = 'On Track';
                    let badgeColor = '#059669';
                    if (subj.rate === 100) {
                        badge = 'Mastered';
                        badgeColor = '#059669';
                    }
                    else if (subj.rate < 60) {
                        badge = 'Needs Focus';
                        badgeColor = '#DC2626';
                    }
                    doc.fillColor(badgeColor).fontSize(8).font('Helvetica-Bold')
                        .text(badge, 440, currentY + 6, { width: contentWidth - 410, align: 'center' });
                    currentY += rowHeight;
                });
            }
            // ─── 4. Weekly Highlights & Key Takeaways ──────────────────────────────
            const highlightsY = Math.max(currentY + 16, 360);
            doc.fillColor('#1E293B').fontSize(13).font('Helvetica-Bold')
                .text('Weekly Highlights & Academic Insights', 36, highlightsY);
            const boxY = highlightsY + 18;
            doc.rect(36, boxY, contentWidth, 75).fill('#F8FAFC');
            doc.rect(36, boxY, contentWidth, 75).stroke('#E2E8F0');
            doc.fillColor('#059669').fontSize(10).font('Helvetica-Bold')
                .text('🏆 Strongest Subject:', 50, boxY + 12);
            doc.fillColor('#1E293B').fontSize(10).font('Helvetica')
                .text(` ${data.bestSubject || 'Consistent across all topics'}`, 175, boxY + 12);
            doc.fillColor('#D97706').fontSize(10).font('Helvetica-Bold')
                .text('🎯 Area to Boost:', 50, boxY + 30);
            doc.fillColor('#1E293B').fontSize(10).font('Helvetica')
                .text(` ${data.weakestSubject || 'None! Excellent balance throughout the week'}`, 155, boxY + 30);
            doc.fillColor('#4338CA').fontSize(10).font('Helvetica-Bold')
                .text('🌟 Habit Consistency:', 50, boxY + 48);
            doc.fillColor('#1E293B').fontSize(10).font('Helvetica')
                .text(data.completionRate >= 80
                ? ` Stellar performance! ${data.childName} finished over 80% of scheduled tasks.`
                : ` Keep encouraging daily routines! Small 15-minute bursts will boost next week's streak.`, 175, boxY + 48);
            // ─── 5. Motivational Footer Note ───────────────────────────────────────
            const noteY = boxY + 90;
            doc.rect(36, noteY, contentWidth, 54).fill('#FEF3C7');
            doc.rect(36, noteY, contentWidth, 54).stroke('#FDE68A');
            doc.fillColor('#92400E').fontSize(10).font('Helvetica-Bold')
                .text('A Note from the KidQuest Team:', 50, noteY + 10);
            doc.fillColor('#78350F').fontSize(9).font('Helvetica')
                .text(`"Every task completed is a victory for building focus, autonomy, and lifelong positive habits. Thank you for championing ${data.childName}'s growth!"`, 50, noteY + 26, { width: contentWidth - 28 });
            // ─── 6. Subfooter ──────────────────────────────────────────────────────
            doc.fillColor('#94A3B8').fontSize(8).font('Helvetica')
                .text('KidQuest Routine Management  •  Automated Weekly Digest  •  To change email preferences, visit Settings in the app.', 36, doc.page.height - 40, { align: 'center', width: contentWidth });
            doc.end();
        }
        catch (err) {
            reject(err);
        }
    });
}
function drawKpiCard(doc, x, y, width, height, title, value, subtitle, bgColor, accentColor) {
    doc.rect(x, y, width, height).fill(bgColor);
    doc.rect(x, y, 4, height).fill(accentColor); // left vertical color accent
    doc.fillColor('#64748B').fontSize(8).font('Helvetica-Bold')
        .text(title.toUpperCase(), x + 12, y + 10);
    doc.fillColor(accentColor).fontSize(16).font('Helvetica-Bold')
        .text(value, x + 12, y + 23);
    doc.fillColor('#475569').fontSize(8).font('Helvetica')
        .text(subtitle, x + 12, y + 46);
}
//# sourceMappingURL=generateWeeklyPdf.js.map