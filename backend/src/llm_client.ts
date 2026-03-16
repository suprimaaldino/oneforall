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
    `You are ${config.botName}, a friendly WhatsApp assistant.`;
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
  promptParts.push(`INSTRUCTION:`);
  promptParts.push(`1) Infer the tone from user message, but respect the tone_instruction override if not 'auto-detect'.`);
  promptParts.push(`2) Produce a direct reply in the chosen tone.`);
  promptParts.push(`3) Provide a short [ADMIN_NOTE] about why this reply suits the tone.`);
  promptParts.push(`4) If the message requires human intervention, add [HUMAN_REVIEW].`);
  promptParts.push(`5) Return JSON only: { "reply": "...", "tone": "...", "confidence": 0.0-1.0, "admin_note": "...", "flags": "" }`);

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
      reply: "Sorry, I'm having trouble thinking right now. Please try again in a moment! 🤖",
      tone: 'neutral',
      confidence: 0.0,
      admin_note: 'LLM service unavailable — sent fallback reply',
      flags: 'LLM_ERROR',
    };
  }
}
