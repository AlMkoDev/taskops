// WhatsApp Notification Service
// Sends WhatsApp messages via Meta Cloud API

import axios from 'axios';
import type { Report } from '../../types/agrireports';

const META_API_BASE = 'https://graph.facebook.com/v18.0';

/**
 * Send WhatsApp message via Meta Cloud API
 */
export async function sendWhatsApp(opts: {
  to: string;
  message: string;
  template?: {
    name: string;
    language: { code: string };
    components: Array<{
      type: 'body';
      parameters: Array<{ type: 'text'; text: string }>;
    }>;
  };
}): Promise<{ messageId: string }> {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.warn('⚠️  WhatsApp not configured - message will not be sent');
    // Return mock response for development
    return { messageId: `mock_${Date.now()}` };
  }

  const url = `${META_API_BASE}/${phoneNumberId}/messages`;

  let payload: Record<string, unknown>;

  if (opts.template) {
    // Use template message
    payload = {
      messaging_product: 'whatsapp',
      to: formatPhoneNumber(opts.to),
      type: 'template',
      template: opts.template,
    };
  } else {
    // Use text message (for development/testing)
    payload = {
      messaging_product: 'whatsapp',
      to: formatPhoneNumber(opts.to),
      type: 'text',
      text: { body: opts.message },
    };
  }

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const messageId = response.data.messages?.[0]?.id || `unknown_${Date.now()}`;
    console.log(`✅ WhatsApp sent to ${opts.to}: ${messageId}`);
    
    return { messageId };
  } catch (error) {
    console.error('❌ Failed to send WhatsApp:', error);
    throw error;
  }
}

/**
 * Format phone number to E.164 format
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Add country code if missing (default to South Africa +27)
  if (!cleaned.startsWith('27') && cleaned.startsWith('0')) {
    cleaned = '27' + cleaned.substring(1);
  } else if (!cleaned.startsWith('27') && cleaned.length === 9) {
    cleaned = '27' + cleaned;
  }
  
  // Add + prefix
  return '+' + cleaned;
}

/**
 * Build WhatsApp template for report submission
 */
export function buildSubmittedTemplate(
  report: Report,
  reviewLink: string
): {
  name: string;
  language: { code: string };
  components: Array<{
    type: 'body';
    parameters: Array<{ type: 'text'; text: string }>;
  }>;
} {
  const templateName = process.env.META_WA_TEMPLATE_SUBMITTED || 'agri_report_submitted';
  
  return {
    name: templateName,
    language: { code: 'en' },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: report.period.toUpperCase() },
          { type: 'text', text: report.roleName || report.role },
          { type: 'text', text: report.authorName || report.author.name },
          { type: 'text', text: reviewLink },
        ],
      },
    ],
  };
}

/**
 * Build WhatsApp template for report review
 */
export function buildReviewedTemplate(report: Report): {
  name: string;
  language: { code: string };
  components: Array<{
    type: 'body';
    parameters: Array<{ type: 'text'; text: string }>;
  }>;
} {
  const templateName = process.env.META_WA_TEMPLATE_REVIEWED || 'agri_report_reviewed';
  const statusText = report.status.replace('_', ' ').toUpperCase();
  
  return {
    name: templateName,
    language: { code: 'en' },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: statusText },
          { type: 'text', text: getReportTitle(report) },
          { type: 'text', text: report.id.substring(0, 8) },
          { type: 'text', text: report.reviewComments || 'No comments' },
        ],
      },
    ],
  };
}

/**
 * Build free-form text message for development (no template required)
 */
export function buildSubmittedFreeform(
  report: Report,
  reviewLink: string
): string {
  return `📋 *New Report Submitted*\n\n📅 Period: ${report.period.toUpperCase()}\n👤 Role: ${report.roleName || report.role}\n📝 Submitted by: ${report.authorName || report.author.name}\n${report.reportingWindow ? `🗓️ Window: ${report.reportingWindow}\n` : ''}\n🔗 Review: ${reviewLink}`;
}

/**
 * Build free-form text message for development (no template required)
 */
export function buildReviewedFreeform(report: Report): string {
  const statusText = report.status.replace('_', ' ').toUpperCase();
  const emoji = getStatusEmoji(report.status);
  
  return `${emoji} *Report ${statusText}*\n\n📄 Report: ${getReportTitle(report)}\n🆔 ID: ${report.id.substring(0, 8)}\n👨‍💼 Reviewer: ${report.reviewerName || 'Reviewer'}\n${report.reviewComments ? `💬 Comments: ${report.reviewComments}\n` : ''}`;
}

/**
 * Helper: Get report title
 */
function getReportTitle(report: Report): string {
  return report.title || `${report.period} ${report.roleName || report.role} Report`;
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
