// Email Notification Service
// Sends email notifications using Nodemailer

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Email transporter singleton
let transporter: Transporter | null = null;

/**
 * Get or create email transporter
 */
function getTransporter(): Transporter {
  if (transporter) return transporter;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const _emailFrom = process.env.EMAIL_FROM || 'AgriReports <noreply@agrireports.com>';

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn('⚠️  SMTP not configured - emails will not be sent');
    // Create test transporter for development
    transporter = nodemailer.createTransport({
      host: 'localhost',
      port: 1025,
      secure: false,
    });
  } else {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  return transporter;
}

/**
 * Send email notification
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const mailer = getTransporter();

  try {
    await mailer.sendMail({
      from: process.env.EMAIL_FROM || 'AgriReports <noreply@agrireports.com>',
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text || stripHtml(opts.html),
    });

    console.log(`✅ Email sent to ${opts.to}: ${opts.subject}`);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw error;
  }
}

/**
 * Strip HTML tags for text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

/**
 * Verify SMTP connection on startup
 */
export async function verifySmtpConnection(): Promise<boolean> {
  try {
    const mailer = getTransporter();
    await mailer.verify();
    console.log('✅ SMTP connection verified');
    return true;
  } catch (error) {
    console.warn('⚠️  SMTP connection failed:', error);
    return false;
  }
}
