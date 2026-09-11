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
exports.buildWeeklyReportHtml = buildWeeklyReportHtml;
exports.sendWeeklyReportEmail = sendWeeklyReportEmail;
const nodemailer = __importStar(require("nodemailer"));
/**
 * Creates a configured Nodemailer transporter supporting SendGrid or Gmail/SMTP.
 */
function createTransporter() {
    const sendgridKey = process.env.SENDGRID_API_KEY;
    const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_PASS;
    if (sendgridKey) {
        return nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            auth: {
                user: 'apikey',
                pass: sendgridKey,
            },
        });
    }
    if (smtpUser && smtpPass) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '465', 10),
            secure: process.env.SMTP_PORT === '465' || !process.env.SMTP_PORT,
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });
    }
    // Fallback test transporter (logs to console if no email credentials configured)
    console.warn('[emailService] No SMTP credentials provided. Creating fallback logger transport.');
    return nodemailer.createTransport({
        streamTransport: true,
        newline: 'windows',
        buffer: true,
    });
}
/**
 * Builds a modern, responsive HTML email with inline CSS.
 */
function buildWeeklyReportHtml(parentName, childName, weekStart, weekEnd, stats) {
    const appUrl = process.env.APP_WEB_URL || 'https://kidquest-app.web.app';
    const completionColor = stats.completionRate >= 80 ? '#059669' : '#4F46E5';
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${childName}'s Weekly Report</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">
    Here's ${childName}'s weekly progress: ${Math.round(stats.completionRate)}% completion rate, ${stats.currentStreak} day streak, and ${stats.xpEarnedThisWeek} XP earned!
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
          
          <!-- Banner Header -->
          <tr>
            <td style="background-color: #1E1B4B; padding: 32px 28px; text-align: left;">
              <span style="display: inline-block; font-size: 24px; font-weight: 900; color: #FCD34D; letter-spacing: -0.5px;">🎯 KidQuest</span>
              <p style="margin: 6px 0 0 0; color: #E0E7FF; font-size: 13px; font-weight: 500;">Weekly Habit & Academic Progress Digest</p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 28px 28px 16px 28px;">
              <h2 style="margin: 0 0 8px 0; font-size: 20px; color: #0F172A; font-weight: 800;">
                Here's ${childName}'s Weekly Report! 🎉
              </h2>
              <p style="margin: 0 0 20px 0; color: #64748B; font-size: 14px; line-height: 22px;">
                Hi ${parentName}, another week of growth is in the books! Below is a quick snapshot of ${childName}'s routine completions and study focus for <strong>${weekStart} – ${weekEnd}</strong>.
              </p>

              <!-- KPI Highlight Row -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td width="32%" style="background-color: #EEF2FF; border-radius: 12px; padding: 14px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 700; color: #6366F1; text-transform: uppercase;">Completion</div>
                    <div style="font-size: 20px; font-weight: 800; color: ${completionColor}; margin-top: 4px;">${Math.round(stats.completionRate)}%</div>
                    <div style="font-size: 10px; color: #475569; margin-top: 2px;">${stats.completedTasks}/${stats.totalTasks} Quests</div>
                  </td>
                  <td width="2%"></td>
                  <td width="32%" style="background-color: #FEF3C7; border-radius: 12px; padding: 14px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 700; color: #D97706; text-transform: uppercase;">Streak</div>
                    <div style="font-size: 20px; font-weight: 800; color: #B45309; margin-top: 4px;">${stats.currentStreak} Days 🔥</div>
                    <div style="font-size: 10px; color: #475569; margin-top: 2px;">Best: ${stats.longestStreak} Days</div>
                  </td>
                  <td width="2%"></td>
                  <td width="32%" style="background-color: #ECFDF5; border-radius: 12px; padding: 14px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 700; color: #059669; text-transform: uppercase;">XP Earned</div>
                    <div style="font-size: 20px; font-weight: 800; color: #047857; margin-top: 4px;">+${stats.xpEarnedThisWeek}</div>
                    <div style="font-size: 10px; color: #475569; margin-top: 2px;">Level ${stats.currentLevel}</div>
                  </td>
                </tr>
              </table>

              <!-- Highlights Box -->
              <div style="background-color: #F8FAFC; border-left: 4px solid #4F46E5; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
                <div style="font-size: 13px; color: #1E293B; margin-bottom: 4px;">
                  🏆 <strong>Strongest Focus:</strong> ${stats.bestSubject || 'Balanced across all subjects'}
                </div>
                <div style="font-size: 13px; color: #1E293B;">
                  🎯 <strong>Recommended Boost:</strong> ${stats.weakestSubject || 'None, routines are steady!'}
                </div>
              </div>

              <!-- PDF Attachment Notice -->
              <div style="background-color: #F1F5F9; border-radius: 12px; padding: 12px 16px; margin-bottom: 28px; text-align: center;">
                <span style="font-size: 12px; color: #475569; font-weight: 500;">
                  📎 <strong>Full Printable Report Attached:</strong> A comprehensive 1-page PDF summary is attached to this email for your family records.
                </span>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 20px;">
                <a href="${appUrl}" target="_blank" style="display: inline-block; background-color: #4F46E5; color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
                  Open KidQuest App →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 20px 28px; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94A3B8; line-height: 18px;">
                You are receiving this automated weekly progress digest as a registered parent on KidQuest.<br>
                To opt out of weekly email reports, you can toggle <em>"Weekly Progress Email"</em> off anytime in your in-app <strong>Settings</strong>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
/**
 * Sends the email with PDF attachment via Nodemailer.
 */
async function sendWeeklyReportEmail(options) {
    const transporter = createTransporter();
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || '"KidQuest Progress" <reports@kidquest.app>';
    const html = buildWeeklyReportHtml(options.parentName, options.childName, options.weekStart, options.weekEnd, options.stats);
    const cleanDate = options.weekEnd.replace(/\s+/g, '_');
    const filename = `${options.childName}_Weekly_Report_${cleanDate}.pdf`;
    const mailOptions = {
        from: fromAddress,
        to: options.to,
        subject: `📊 ${options.childName}'s Weekly Progress Report (${options.weekStart} – ${options.weekEnd})`,
        html,
        attachments: [
            {
                filename,
                content: options.pdfBuffer,
                contentType: 'application/pdf',
            },
        ],
    };
    const info = await transporter.sendMail(mailOptions);
    console.log(`[emailService] Report email sent to ${options.to}:`, info?.messageId || 'Delivered');
}
//# sourceMappingURL=emailService.js.map