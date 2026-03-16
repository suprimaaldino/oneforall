import { Router, Request, Response } from 'express';
import { classify, ClassifyResult } from './classifier_client';
import { generate, GenerateResult } from './llm_client';
import { sendWhatsApp } from './wa_client';
import {
  saveMessage,
  getConversation,
  getRecentConversations,
  getAllSettings,
  updateSetting,
  getSetting,
  isDoNotReply,
} from './db';
import { config } from './config';

const router = Router();

// ── Rate limiter (in-memory) ────────────────────────────
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(jid: string): boolean {
  const now = Date.now();
  const windowMs = config.rateLimitWindowMs;
  const maxRequests = config.rateLimitPerMinute;

  let timestamps = rateLimitMap.get(jid) || [];
  timestamps = timestamps.filter((t) => now - t < windowMs);

  if (timestamps.length >= maxRequests) {
    return true;
  }

  timestamps.push(now);
  rateLimitMap.set(jid, timestamps);
  return false;
}

// ── Core message processing pipeline ────────────────────
export async function processIncomingMessage(
  jid: string,
  text: string,
  pushName?: string
): Promise<void> {
  console.log(`[Router] 📩 From ${jid} (${pushName || 'unknown'}): ${text.substring(0, 100)}`);

  // 1. Check do-not-reply list
  if (isDoNotReply(jid)) {
    console.log(`[Router] ⛔ ${jid} is in do-not-reply list, skipping.`);
    return;
  }

  // 2. Check if auto-reply is enabled
  const autoReply = getSetting('auto_reply_enabled');
  if (autoReply !== 'true') {
    console.log('[Router] ⏸ Auto-reply is disabled.');
    return;
  }

  // 3. Rate limiting
  if (isRateLimited(jid)) {
    console.log(`[Router] 🚫 Rate limited: ${jid}`);
    return;
  }

  // 4. Handle opt-out keyword
  if (text.trim().toUpperCase() === 'STOP') {
    await sendWhatsApp(jid, '✅ Auto-replies disabled for you. Send START to re-enable.');
    return;
  }

  // 5. Save incoming message
  saveMessage({ jid, direction: 'incoming', text });

  // 6. Classify tone
  let classification: ClassifyResult;
  try {
    classification = await classify(text);
    console.log(`[Router] 🎭 Tone: ${classification.tone} (${classification.confidence})`);
  } catch (err) {
    console.error('[Router] Classification failed:', err);
    classification = { tone: 'neutral', confidence: 0, notes: 'classification error' };
  }

  // 7. Determine tone instruction
  const defaultTone = getSetting('default_tone') || config.defaultTone;
  const toneInstruction = defaultTone === 'auto-detect' ? classification.tone : defaultTone;

  // 8. Fetch conversation history for context
  const rawHistory = getConversation(jid, 6).reverse();
  const history = rawHistory.map((msg: any) => ({
    role: msg.direction === 'incoming' ? 'user' : 'assistant',
    content: msg.text,
  }));

  // 9. Generate LLM reply
  let result: GenerateResult;
  try {
    result = await generate({
      message: text,
      history,
      tone_instruction: toneInstruction,
      user_name: pushName,
    });
  } catch (err) {
    console.error('[Router] LLM generation failed:', err);
    result = {
      reply: "I'm having trouble right now — please try again shortly! 🤖",
      tone: 'neutral',
      confidence: 0,
      admin_note: 'LLM error fallback',
      flags: 'LLM_ERROR',
    };
  }

  console.log(`[Router] 🤖 Reply: ${result.reply.substring(0, 100)}`);
  console.log(`[Router] 📋 Admin: ${result.admin_note}`);

  // 10. Send reply via WhatsApp
  await sendWhatsApp(jid, result.reply);

  // 11. Save outgoing message with metadata
  saveMessage({
    jid,
    direction: 'outgoing',
    text: result.reply,
    tone: result.tone,
    confidence: result.confidence,
    admin_note: result.admin_note,
    flags: result.flags,
  });
}

// ── Admin REST API endpoints ────────────────────────────

/** GET /api/conversations — list recent conversations */
router.get('/api/conversations', (_req: Request, res: Response) => {
  try {
    const limit = parseInt(_req.query.limit as string) || 50;
    const conversations = getRecentConversations(limit);
    res.json({ success: true, data: conversations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/conversations/:jid — get messages with a specific contact */
router.get('/api/conversations/:jid', (req: Request, res: Response) => {
  try {
    const jid = decodeURIComponent(req.params.jid);
    const limit = parseInt(req.query.limit as string) || 50;
    const messages = getConversation(jid, limit);
    res.json({ success: true, data: messages.reverse() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/settings — get all bot settings */
router.get('/api/settings', (_req: Request, res: Response) => {
  try {
    const settings = getAllSettings();
    res.json({ success: true, data: settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** PUT /api/settings — update a setting */
router.put('/api/settings', (req: Request, res: Response) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      res.status(400).json({ success: false, error: 'Missing key or value' });
      return;
    }
    updateSetting(key, String(value));
    res.json({ success: true, message: `Setting '${key}' updated.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/stats — basic stats for dashboard */
router.get('/api/stats', (_req: Request, res: Response) => {
  try {
    const settings = getAllSettings();
    const conversations = getRecentConversations(1000);
    const totalContacts = conversations.length;
    const totalMessages = conversations.reduce((sum: number, c: any) => sum + c.message_count, 0);
    res.json({
      success: true,
      data: {
        totalContacts,
        totalMessages,
        autoReplyEnabled: settings['auto_reply_enabled'] === 'true',
        botName: settings['bot_name'] || config.botName,
        defaultTone: settings['default_tone'] || config.defaultTone,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export { router };
