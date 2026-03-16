import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from './config';

// Ensure data directory exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(config.dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// ── Schema ──────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    jid         TEXT    NOT NULL,
    direction   TEXT    NOT NULL CHECK(direction IN ('incoming','outgoing')),
    text        TEXT    NOT NULL,
    tone        TEXT,
    confidence  REAL,
    admin_note  TEXT,
    flags       TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_messages_jid ON messages(jid);
  CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Default settings
  INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_reply_enabled', 'true');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('bot_name', '${config.botName}');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('default_tone', '${config.defaultTone}');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('safety_level', '${config.safetyLevel}');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('system_prompt', 'You are DinoBot, a friendly WhatsApp assistant.');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('temperature', '${config.llmTemperature}');

  CREATE TABLE IF NOT EXISTS do_not_reply (
    jid TEXT PRIMARY KEY,
    reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── Prepared statements ─────────────────────────────────
const insertMessage = db.prepare(`
  INSERT INTO messages (jid, direction, text, tone, confidence, admin_note, flags)
  VALUES (@jid, @direction, @text, @tone, @confidence, @admin_note, @flags)
`);

const getConversationStmt = db.prepare(`
  SELECT * FROM messages WHERE jid = @jid ORDER BY created_at DESC LIMIT @limit
`);

const getRecentConversationsStmt = db.prepare(`
  SELECT jid, MAX(created_at) as last_message, COUNT(*) as message_count
  FROM messages
  GROUP BY jid
  ORDER BY last_message DESC
  LIMIT @limit
`);

const getSettingStmt = db.prepare(`SELECT value FROM settings WHERE key = @key`);
const getAllSettingsStmt = db.prepare(`SELECT * FROM settings`);
const upsertSettingStmt = db.prepare(`
  INSERT INTO settings (key, value) VALUES (@key, @value)
  ON CONFLICT(key) DO UPDATE SET value = @value
`);

const isDNRStmt = db.prepare(`SELECT 1 FROM do_not_reply WHERE jid = @jid`);

// ── Exported functions ──────────────────────────────────
export interface MessageRecord {
  jid: string;
  direction: 'incoming' | 'outgoing';
  text: string;
  tone?: string;
  confidence?: number;
  admin_note?: string;
  flags?: string;
}

export function saveMessage(msg: MessageRecord): void {
  insertMessage.run({
    jid: msg.jid,
    direction: msg.direction,
    text: msg.text,
    tone: msg.tone || null,
    confidence: msg.confidence || null,
    admin_note: msg.admin_note || null,
    flags: msg.flags || null,
  });
}

export function getConversation(jid: string, limit = 20): any[] {
  return getConversationStmt.all({ jid, limit });
}

export function getRecentConversations(limit = 50): any[] {
  return getRecentConversationsStmt.all({ limit });
}

export function getSetting(key: string): string | undefined {
  const row = getSettingStmt.get({ key }) as { value: string } | undefined;
  return row?.value;
}

export function getAllSettings(): Record<string, string> {
  const rows = getAllSettingsStmt.all() as { key: string; value: string }[];
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export function updateSetting(key: string, value: string): void {
  upsertSettingStmt.run({ key, value });
}

export function isDoNotReply(jid: string): boolean {
  return !!isDNRStmt.get({ jid });
}

export { db };
