// Email Templates for Report Notifications
// HTML email templates for various report events

import type { Report } from '../../types/agrireports';

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

/**
 * Email template for when a report is submitted for review
 */
export function reportSubmittedTemplate(
  report: Report,
  reviewerEmail: string,
  reviewerName: string
): { subject: string; html: string } {
  const statusColor = getStatusColor(report.status);
  const reportUrl = `${APP_BASE_URL}/reports/${report.id}`;

  const subject = `📋 New Report Submitted: ${getReportTitle(report)}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Report Submitted</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 20px 0;">
            <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                    📋 Report Submitted for Review
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px;">
                    Hi <strong>${reviewerName}</strong>,
                  </p>
                  
                  <p style="margin: 0 0 20px 0; color: #555555; font-size: 14px; line-height: 1.6;">
                    A new report has been submitted and requires your review:
                  </p>
                  
                  <!-- Report Details Box -->
                  <table style="width: 100%; background-color: #f8f9fa; border-left: 4px solid ${statusColor}; border-radius: 4px; margin: 20px 0;">
                    <tr>
                      <td style="padding: 20px;">
                        <table style="width: 100%;">
                          <tr>
                            <td style="padding: 8px 0;">
                              <strong style="color: #666666; font-size: 12px; text-transform: uppercase;">Report</strong><br>
                              <span style="color: #333333; font-size: 16px; font-weight: 600;">${getReportTitle(report)}</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0;">
                              <strong style="color: #666666; font-size: 12px; text-transform: uppercase;">Author</strong><br>
                              <span style="color: #333333; font-size: 14px;">${report.authorName || report.author.name}</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0;">
                              <strong style="color: #666666; font-size: 12px; text-transform: uppercase;">Period</strong><br>
                              <span style="color: #333333; font-size: 14px; text-transform: capitalize;">${report.period}</span>
                            </td>
                          </tr>
                          ${report.reportingWindow ? `
                          <tr>
                            <td style="padding: 8px 0;">
                              <strong style="color: #666666; font-size: 12px; text-transform: uppercase;">Reporting Window</strong><br>
                              <span style="color: #333333; font-size: 14px;">${report.reportingWindow}</span>
                            </td>
                          </tr>
                          ` : ''}
                          <tr>
                            <td style="padding: 8px 0;">
                              <strong style="color: #666666; font-size: 12px; text-transform: uppercase;">Status</strong><br>
                              <span style="display: inline-block; padding: 4px 12px; background-color: ${statusColor}; color: #ffffff; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: capitalize;">
                                ${report.status.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- CTA Button -->
                  <table style="width: 100%; margin: 30px 0;">
                    <tr>
                      <td style="text-align: center;">
                        <a href="${reportUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                          Review Report →
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 20px 0 0 0; color: #999999; font-size: 12px; line-height: 1.6;">
                    This is an automated notification from AgriReports. Please review the report at your earliest convenience.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="margin: 0; color: #999999; font-size: 12px;">
                    © ${new Date().getFullYear()} AgriReports Platform
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

  return { subject, html };
}

/**
 * Email template for when a report is reviewed (approved/rejected/changes requested)
 */
export function reportReviewedTemplate(
  report: Report,
  authorEmail: string,
  authorName: string
): { subject: string; html: string } {
  const statusColor = getStatusColor(report.status);
  const statusEmoji = getStatusEmoji(report.status);
  const reportUrl = `${APP_BASE_URL}/reports/${report.id}`;

  const subject = `${statusEmoji} Report ${report.status.replace('_', ' ')}: ${getReportTitle(report)}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Report Reviewed</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 20px 0;">
            <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%); padding: 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                    ${statusEmoji} Report ${report.status.replace('_', ' ')}
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px;">
                    Hi <strong>${authorName}</strong>,
                  </p>
                  
                  <p style="margin: 0 0 20px 0; color: #555555; font-size: 14px; line-height: 1.6;">
                    Your report has been reviewed. Here are the details:
                  </p>
                  
                  <!-- Report Details Box -->
                  <table style="width: 100%; background-color: #f8f9fa; border-left: 4px solid ${statusColor}; border-radius: 4px; margin: 20px 0;">
                    <tr>
                      <td style="padding: 20px;">
                        <table style="width: 100%;">
                          <tr>
                            <td style="padding: 8px 0;">
                              <strong style="color: #666666; font-size: 12px; text-transform: uppercase;">Report</strong><br>
                              <span style="color: #333333; font-size: 16px; font-weight: 600;">${getReportTitle(report)}</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0;">
                              <strong style="color: #666666; font-size: 12px; text-transform: uppercase;">Reviewer</strong><br>
                              <span style="color: #333333; font-size: 14px;">${report.reviewerName || 'Reviewer'}</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0;">
                              <strong style="color: #666666; font-size: 12px; text-transform: uppercase;">Status</strong><br>
                              <span style="display: inline-block; padding: 4px 12px; background-color: ${statusColor}; color: #ffffff; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: capitalize;">
                                ${report.status.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                          ${report.reviewComments ? `
                          <tr>
                            <td style="padding: 8px 0;">
                              <strong style="color: #666666; font-size: 12px; text-transform: uppercase;">Comments</strong><br>
                              <span style="color: #333333; font-size: 14px; font-style: italic;">${report.reviewComments}</span>
                            </td>
                          </tr>
                          ` : ''}
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  ${report.status === 'changes_requested' ? `
                  <table style="width: 100%; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; margin: 20px 0; padding: 15px;">
                    <tr>
                      <td>
                        <p style="margin: 0; color: #856404; font-size: 14px;">
                          <strong>⚠️ Action Required:</strong> Please review the comments and make the necessary changes before resubmitting.
                        </p>
                      </td>
                    </tr>
                  </table>
                  ` : ''}
                  
                  <!-- CTA Button -->
                  <table style="width: 100%; margin: 30px 0;">
                    <tr>
                      <td style="text-align: center;">
                        <a href="${reportUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                          ${report.status === 'changes_requested' ? 'Make Changes' : 'View Report'} →
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 20px 0 0 0; color: #999999; font-size: 12px; line-height: 1.6;">
                    This is an automated notification from AgriReports.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="margin: 0; color: #999999; font-size: 12px;">
                    © ${new Date().getFullYear()} AgriReports Platform
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

  return { subject, html };
}

/**
 * Helper: Get report title
 */
function getReportTitle(report: Report): string {
  return report.title || `${report.period} ${report.roleName || report.role} Report`;
}

/**
 * Helper: Get status color
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'approved':
      return '#28a745';
    case 'rejected':
      return '#dc3545';
    case 'changes_requested':
      return '#ffc107';
    case 'submitted':
      return '#17a2b8';
    default:
      return '#6c757d';
  }
}

/**
 * Helper: Get status emoji
 */
function getStatusEmoji(status: string): string {
  switch (status) {
    case 'approved':
      return '✅';
    case 'rejected':
      return '❌';
    case 'changes_requested':
      return '⚠️';
    case 'submitted':
      return '📋';
    default:
      return '📄';
  }
}
