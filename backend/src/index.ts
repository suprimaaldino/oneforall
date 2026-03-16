import express from 'express';
import cors from 'cors';
import { config } from './config';
import { router, processIncomingMessage } from './router';
import { startWhatsApp } from './wa_client';

const app = express();

// ── Middleware ───────────────────────────────────────────
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// ── Admin API routes ────────────────────────────────────
app.use(router);

// ── Health check ────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'wa-dino-bot-backend', timestamp: new Date().toISOString() });
});

// ── Start services ──────────────────────────────────────
async function main(): Promise<void> {
  // Start Express API server
  app.listen(config.port, () => {
    console.log(`\n🦕 DinoBot Backend running on http://localhost:${config.port}`);
    console.log(`   Admin API:  http://localhost:${config.port}/api/settings`);
    console.log(`   Health:     http://localhost:${config.port}/health`);
    console.log(`   LLM:       ${config.llmServiceUrl}`);
    console.log(`   Classifier: ${config.classifierServiceUrl}\n`);
  });

  // Start WhatsApp connection (QR login)
  console.log('🔑 Starting WhatsApp connection — scan QR code below:\n');
  await startWhatsApp(async (jid, text, pushName) => {
    await processIncomingMessage(jid, text, pushName);
  });
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
