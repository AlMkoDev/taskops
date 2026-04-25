#!/usr/bin/env node
/**
 * AgriReports Queue Worker
 * Starts the notification processing worker
 * 
 * Usage:
 *   npm run queue:worker    - Start notification worker
 */

import { createNotificationWorker } from '../src/lib/queue/notification-worker.js';
import { checkRedisHealth, closeRedisConnection } from '../src/lib/queue/queue-config.js';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function main() {
  log(colors.blue, '\n🚀 AgriReports Queue Worker\n');

  // Check Redis connection
  log(colors.cyan, 'Checking Redis connection...');
  const healthy = await checkRedisHealth();

  if (!healthy) {
    log(colors.red, '❌ Redis connection failed!');
    log(colors.yellow, 'Make sure Redis is running: redis-server');
    log(colors.yellow, 'Or set REDIS_URL environment variable');
    process.exit(1);
  }

  log(colors.green, '✅ Redis connected\n');

  // Create and start worker
  log(colors.cyan, 'Starting notification worker...');
  const worker = createNotificationWorker();

  log(colors.green, '✅ Worker started successfully\n');
  log(colors.white, '📊 Worker Status:');
  log(colors.white, `   - Concurrency: 10 jobs`);
  log(colors.white, `   - Rate limit: 100 jobs/minute`);
  log(colors.white, `   - Queues: notifications, email-notifications, whatsapp-notifications\n`);

  log(colors.cyan, 'Press Ctrl+C to stop\n');

  // Handle graceful shutdown
  const shutdown = async (signal) => {
    log(colors.yellow, `\n\n🛑 Received ${signal}. Shutting down gracefully...`);
    
    await worker.close();
    log(colors.green, '✅ Worker stopped');
    
    await closeRedisConnection();
    log(colors.green, '✅ Redis connection closed\n');
    
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Keep process alive
  await new Promise(() => {});
}

main().catch((error) => {
  log(colors.red, '\n❌ Fatal error:');
  console.error(error);
  process.exit(1);
});
