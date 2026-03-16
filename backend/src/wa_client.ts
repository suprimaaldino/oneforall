import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
  proto,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import path from 'path';
import qrcode from 'qrcode-terminal';

const logger = pino({ level: 'warn' });

let sock: WASocket | null = null;

export type MessageHandler = (jid: string, text: string, pushName?: string) => Promise<void>;

/**
 * Starts the WhatsApp connection using Baileys.
 * Displays QR code in terminal for authentication.
 * Calls `onMessage` for every incoming text message.
 */
export async function startWhatsApp(onMessage: MessageHandler): Promise<void> {
  const authDir = path.resolve(__dirname, '..', 'auth_info');
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  sock = makeWASocket({
    auth: state,
    logger,
    browser: ['DinoBot', 'Chrome', '1.0.0'],
  });

  // Handle connection updates (QR, reconnect, logout)
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    // ── QR code received — render it in the terminal ──
    if (qr) {
      console.log('\n🔑 Scan this QR code with WhatsApp:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        `[WA] Connection closed. Status: ${statusCode}. Reconnecting: ${shouldReconnect}`
      );

      if (shouldReconnect) {
        // Reconnect after a short delay
        setTimeout(() => startWhatsApp(onMessage), 3000);
      } else {
        console.log('[WA] Logged out. Please delete auth_info/ and restart to re-authenticate.');
      }
    } else if (connection === 'open') {
      console.log('[WA] ✅ Connected to WhatsApp!');
    }
  });

  // Persist credentials on update
  sock.ev.on('creds.update', saveCreds);

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      // Skip messages sent by the bot itself
      if (msg.key.fromMe) continue;

      // Skip non-personal chats (groups, broadcasts)
      const jid = msg.key.remoteJid;
      if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast') continue;

      // Extract text content
      const text = extractText(msg.message);
      if (!text) continue; // Skip non-text messages (media, stickers, etc.)

      const pushName = msg.pushName || undefined;

      try {
        await onMessage(jid, text, pushName);
      } catch (err) {
        console.error(`[WA] Error processing message from ${jid}:`, err);
      }
    }
  });
}

/**
 * Sends a text message to a WhatsApp JID.
 */
export async function sendWhatsApp(jid: string, text: string): Promise<void> {
  if (!sock) {
    console.error('[WA] Socket not initialized — cannot send message.');
    return;
  }

  try {
    await sock.sendMessage(jid, { text });
    console.log(`[WA] → Sent to ${jid}: ${text.substring(0, 80)}...`);
  } catch (err) {
    console.error(`[WA] Failed to send message to ${jid}:`, err);
  }
}

/**
 * Extracts plain text from various WhatsApp message types.
 */
function extractText(message: proto.IMessage | null | undefined): string | null {
  if (!message) return null;

  // Standard text
  if (message.conversation) return message.conversation;

  // Extended text (replies, links, etc.)
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;

  // Image/video/document with caption
  if (message.imageMessage?.caption) return message.imageMessage.caption;
  if (message.videoMessage?.caption) return message.videoMessage.caption;
  if (message.documentMessage?.caption) return message.documentMessage.caption;

  // For unsupported types, return null
  return null;
}
