# Notification Service Configuration

## Environment Variables

Add these to your `.env.local` file:

### Email Configuration (SMTP)

```env
# SMTP Server Settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM="AgriReports <noreply@agrireports.com>"
```

**For Development (Mailcatcher):**
```env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=dev
SMTP_PASS=dev
EMAIL_FROM="AgriReports Dev <dev@localhost>"
```

### WhatsApp Configuration (Meta Cloud API)

```env
# Meta Cloud API Settings
META_PHONE_NUMBER_ID=123456789
META_ACCESS_TOKEN=your-meta-access-token
META_WA_VERIFY_TOKEN=your-verify-token
META_APP_SECRET=your-app-secret

# WhatsApp Template Names (optional, defaults provided)
META_WA_TEMPLATE_SUBMITTED=agri_report_submitted
META_WA_TEMPLATE_REVIEWED=agri_report_reviewed
```

**For Development (Free-form messages):**
- Leave `META_PHONE_NUMBER_ID` and `META_ACCESS_TOKEN` empty
- The system will use free-form text messages instead of templates
- Messages will be logged to console

### Application Settings

```env
# Application Base URL (for notification links)
APP_BASE_URL=http://localhost:3000

# For production:
# APP_BASE_URL=https://your-domain.com
```

---

## Setup Instructions

### 1. Email Setup

#### Option A: Gmail SMTP
1. Enable 2-factor authentication on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the app password in `SMTP_PASS`

#### Option B: Mailcatcher (Development)
```bash
# Install Mailcatcher (Ruby gem)
gem install mailcatcher

# Start Mailcatcher
mailcatcher

# View emails at: http://localhost:1080
# SMTP listens on: localhost:1025
```

#### Option C: SendGrid/Resend
```env
# SendGrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key

# Resend
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=your-resend-api-key
```

### 2. WhatsApp Setup

#### Option A: Meta Cloud API (Production)

1. **Create Meta Developer Account**
   - Go to: https://developers.facebook.com/
   - Create a new app or use existing app

2. **Set up WhatsApp Product**
   - Add WhatsApp product to your app
   - Get Phone Number ID and Access Token

3. **Create Message Templates**
   
   **Template: agri_report_submitted**
   ```
   📋 *New Report Submitted*
   
   📅 {{1}} | 👤 {{2}}
   📝 Submitted by {{3}}
   🔗 {{4}}
   ```
   
   **Template: agri_report_reviewed**
   ```
   {{1}} *Report {{2}}*
   
   🆔 ID: {{3}}
   💬 {{4}}
   ```

4. **Configure Webhook**
   - Webhook URL: `https://your-domain.com/api/v1/webhooks/whatsapp`
   - Verify Token: Set in `META_WA_VERIFY_TOKEN`
   - Subscribe to: `messages` and `message_status_updates`

#### Option B: Development Mode (No Setup Required)

Leave WhatsApp environment variables empty:
```env
META_PHONE_NUMBER_ID=
META_ACCESS_TOKEN=
```

The system will:
- Log messages to console instead of sending
- Use free-form text format
- Work without Meta Developer account

---

## Testing Notifications

### Test Email

```typescript
import { sendEmail } from '@/lib/notifications/email-service';

await sendEmail({
  to: 'test@example.com',
  subject: 'Test Email',
  html: '<h1>Hello World</h1>',
});
```

### Test WhatsApp

```typescript
import { sendWhatsApp } from '@/lib/notifications/whatsapp-service';

await sendWhatsApp({
  to: '+27123456789',
  message: '📋 Test notification from AgriReports',
});
```

### Test Full Workflow

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Create a Report**
   - Login to the app
   - Create a new report

3. **Submit for Review**
   - Fill required fields
   - Add signature
   - Submit
   
   **Expected:**
   - Console log: `✅ Notifications sent for report submission: <id>`
   - Email sent to reviewer (check Mailcatcher at http://localhost:1080)
   - WhatsApp logged to console (or sent if configured)

4. **Review Report**
   - Login as reviewer
   - Approve/reject the report
   
   **Expected:**
   - Console log: `✅ Notifications sent for report review: <id>`
   - Email sent to author
   - WhatsApp logged to console (or sent if configured)

---

## Webhook Testing

### Local Testing with ngrok

```bash
# Install ngrok
npm install -g ngrok

# Start your dev server
npm run dev

# Expose to internet
ngrok http 3000

# Configure Meta webhook URL:
# https://<your-ngrok-url>.ngrok.io/api/v1/webhooks/whatsapp
```

### Test Webhook Verification

```bash
curl "http://localhost:3000/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=your-verify-token&hub.challenge=123456"
```

**Expected Response:** `123456` (plain text)

### Test Webhook Event

```bash
curl -X POST http://localhost:3000/api/v1/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=test" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "statuses": [{
            "id": "test-message-id",
            "status": "delivered",
            "recipient_id": "27123456789"
          }]
        }
      }]
    }]
  }'
```

**Expected Response:** `{ "success": true }`

---

## Monitoring & Debugging

### Console Logs

The notification service logs all activities:

```
✅ Email sent to reviewer@example.com: 📋 New Report Submitted: Daily Field Ops Manager Report
✅ WhatsApp sent to +27123456789: mock_1234567890
✅ Notifications sent for report submission: abc-123-def
📱 WhatsApp status update: wamid.123 - delivered
```

### Common Issues

#### Email Not Sending
```
❌ Failed to send email: Error: connect ECONNREFUSED 127.0.0.1:1025
```
**Fix:** Check SMTP configuration, ensure mail server is running

#### WhatsApp Not Sending
```
⚠️  WhatsApp not configured - message will not be sent
```
**Info:** This is normal in development. Messages are logged to console.

#### Webhook Verification Failed
```
❌ WhatsApp webhook verification failed
```
**Fix:** Ensure `META_WA_VERIFY_TOKEN` matches what you configured in Meta Developer Console

### Performance

Notifications are sent **asynchronously** (fire-and-forget):
- ✅ API response is not delayed by notification sending
- ✅ Failed notifications don't break the main workflow
- ⚠️ Errors are logged but not returned to user

---

## Production Checklist

Before deploying to production:

- [ ] Configure production SMTP server (SendGrid, Resend, etc.)
- [ ] Set up Meta Cloud API with approved templates
- [ ] Configure webhook URL with HTTPS
- [ ] Set all environment variables
- [ ] Test email delivery to real addresses
- [ ] Test WhatsApp delivery to real phone numbers
- [ ] Verify webhook signature validation
- [ ] Monitor notification delivery rates
- [ ] Set up error alerting for failed notifications

---

## Architecture

```
┌─────────────────┐
│  API Endpoint   │
│  (Submit/Review)│
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Notification           │
│  Orchestrator           │
└────────┬────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐  ┌──────────┐
│ Email │  │ WhatsApp │
│       │  │          │
└───┬───┘  └────┬─────┘
    │           │
    ▼           ▼
┌───────┐  ┌──────────┐
│ SMTP  │  │ Meta API │
│ Server│  │          │
└───────┘  └──────────┘
```

---

## Future Enhancements

- [ ] Redis/BullMQ queue for retry logic
- [ ] Dead-letter queue for failed notifications
- [ ] Notification preferences per user
- [ ] SMS notifications (Twilio)
- [ ] Push notifications (Firebase)
- [ ] Notification analytics dashboard
- [ ] Rate limiting for bulk notifications
