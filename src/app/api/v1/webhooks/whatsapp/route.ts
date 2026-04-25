// WhatsApp Webhook Handler
// Receives delivery status updates from Meta Cloud API

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * GET /api/v1/webhooks/whatsapp
 * 
 * Webhook verification endpoint for Meta Cloud API
 * Meta sends a GET request to verify the webhook URL
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  
  const verifyToken = process.env.META_WA_VERIFY_TOKEN;
  
  // Verify the webhook
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ WhatsApp webhook verified successfully');
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
  
  console.warn('❌ WhatsApp webhook verification failed');
  return new NextResponse('Forbidden', { status: 403 });
}

/**
 * POST /api/v1/webhooks/whatsapp
 * 
 * Webhook event handler for delivery status updates
 * Meta sends POST requests with message delivery statuses
 */
export async function POST(request: NextRequest) {
  try {
    // Verify HMAC signature
    const signature = request.headers.get('x-hub-signature-256');
    const rawBody = await request.text();
    
    if (!verifyHmacSignature(rawBody, signature)) {
      console.warn('❌ Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }
    
    const body = JSON.parse(rawBody);
    
    // Process entry array
    if (body.entry && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        if (!entry.changes || !Array.isArray(entry.changes)) continue;
        
        for (const change of entry.changes) {
          const value = change.value;
          
          // Process status updates
          if (value.statuses && Array.isArray(value.statuses)) {
            for (const status of value.statuses) {
              await processStatusUpdate(status);
            }
          }
          
          // Process incoming messages (if needed in future)
          if (value.messages && Array.isArray(value.messages)) {
            for (const message of value.messages) {
              await processIncomingMessage(message);
            }
          }
        }
      }
    }
    
    // Always respond 200 OK to Meta (even on errors)
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Always respond 200 to prevent Meta from retrying
    return NextResponse.json({ success: true });
  }
}

/**
 * Verify HMAC-SHA256 signature
 */
function verifyHmacSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    console.warn('⚠️  META_APP_SECRET not configured');
    return false;
  }
  
  // Extract hash from signature (format: sha256=...)
  const providedHash = signature.replace('sha256=', '');
  
  // Compute expected hash
  const expectedHash = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');
  
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(providedHash, 'hex'),
    Buffer.from(expectedHash, 'hex')
  );
}

/**
 * Process message status update
 */
interface StatusUpdate {
  id: string;
  status: string;
  recipient_id?: string;
  timestamp?: number;
  errors?: Array<{ code: number; title: string; message: string }>;
}

async function processStatusUpdate(update: StatusUpdate): Promise<void> {
  const {
    id, // WhatsApp message ID
    status: deliveryStatus, // sent, delivered, read, failed
    recipient_id: _recipient_id,
    timestamp: _timestamp,
  } = update;
  
  console.log(`📱 WhatsApp status update: ${id} - ${deliveryStatus}`);
  
  // TODO: Update database with delivery status
  // Example: await whatsappRepository.updateStatus(id, status);
  
  // Handle failed messages
  if (deliveryStatus === 'failed') {
    const error = update.errors?.[0];
    console.error(`❌ WhatsApp message failed: ${id}`, error);
    // TODO: Implement retry logic or dead-letter queue
  }
}

/**
 * Process incoming message (for future two-way communication)
 */
interface IncomingMessage {
  from: string;
  id: string;
  timestamp?: number;
  type?: string;
  text?: { body: string };
}

async function processIncomingMessage(message: IncomingMessage): Promise<void> {
  const {
    from,
    id: _id,
    timestamp: _timestamp,
    type: _type,
    text,
  } = message;
  
  console.log(`📨 Incoming WhatsApp from ${from}:`, text?.body);
  
  // TODO: Implement response logic for incoming messages
  // Example: Auto-reply, command processing, etc.
}
