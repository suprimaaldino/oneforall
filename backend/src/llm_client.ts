import axios from 'axios';
import { config } from './config';
import { getSetting } from './db';

export interface GenerateRequest {
  message: string;
  history: { role: string; content: string }[];
  tone_instruction: string;
  user_name?: string;
}

export interface GenerateResult {
  reply: string;
  tone: string;
  confidence: number;
  admin_note: string;
  flags?: string;
  tokens_used?: number;
}

/**
 * Calls the LLM service to generate a reply based on context and tone.
 */
export async function generate(payload: GenerateRequest): Promise<GenerateResult> {
  const systemPrompt = getSetting('system_prompt') ||
    `Kamu adalah ${config.botName}, asisten pribadi WhatsApp yang ramah.`;
  const temperature = parseFloat(getSetting('temperature') || String(config.llmTemperature));

  // Build the full prompt string for the LLM service
  const promptParts: string[] = [
    `SYSTEM:\n${systemPrompt}`,
    '',
    `METADATA:`,
    JSON.stringify({
      user_name: payload.user_name || 'User',
      channel: 'whatsapp',
      tone_instruction: payload.tone_instruction,
      max_tokens: config.llmMaxTokens,
      safety_level: config.safetyLevel,
    }, null, 2),
    '',
    `CONTEXT:`,
    `- Last messages (most recent last):`,
  ];

  // Append conversation history
  const recentHistory = payload.history.slice(-5);
  recentHistory.forEach((msg, i) => {
    const label = msg.role === 'user' ? 'User' : 'Bot';
    promptParts.push(`${i + 1}) ${label}: "${msg.content}"`);
  });

  // Current message
  promptParts.push('');
  promptParts.push(`Current message from User: "${payload.message}"`);
  promptParts.push('');
  promptParts.push(`INSTRUKSI:`);
  promptParts.push(`1) Tentukan nada dari pesan pengguna, tapi ikuti tone_instruction jika bukan 'auto-detect'.`);
  promptParts.push(`2) Buat balasan langsung dengan nada yang dipilih, dalam Bahasa Indonesia.`);
  promptParts.push(`3) Berikan [ADMIN_NOTE] singkat tentang mengapa balasan ini cocok dengan nada.`);
  promptParts.push(`4) Jika pesan memerlukan intervensi manusia, tambahkan [HUMAN_REVIEW].`);
  promptParts.push(`5) Kembalikan JSON saja: { "reply": "...", "tone": "...", "confidence": 0.0-1.0, "admin_note": "...", "flags": "" }`);

  const fullPrompt = promptParts.join('\n');

  try {
    const response = await axios.post(
      `${config.llmServiceUrl}/generate`,
      {
        prompt: fullPrompt,
        tone_instruction: payload.tone_instruction,
        max_tokens: config.llmMaxTokens,
        temperature,
      },
      { timeout: 60000 } // LLM can be slow on CPU
    );

    return response.data as GenerateResult;
  } catch (error: any) {
    console.error('[LLM] Service error:', error.message);
    return {
      reply: 'Maaf, aku lagi ada gangguan. Coba lagi sebentar ya! 🤖',
      tone: 'neutral',
      confidence: 0.0,
      admin_note: 'LLM service tidak tersedia — mengirim balasan fallback',
      flags: 'LLM_ERROR',
    };
  }
}
