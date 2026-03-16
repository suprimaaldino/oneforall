import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),

  // Database
  dbPath: process.env.DB_PATH || './data/dinobot.db',

  // Service URLs
  llmServiceUrl: process.env.LLM_SERVICE_URL || 'http://localhost:8001',
  classifierServiceUrl: process.env.CLASSIFIER_SERVICE_URL || 'http://localhost:8002',

  // Bot personality
  botName: process.env.BOT_NAME || 'DinoBot',
  defaultTone: process.env.DEFAULT_TONE || 'auto-detect',
  safetyLevel: process.env.SAFETY_LEVEL || 'normal',

  // Rate limiting
  rateLimitPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '20', 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),

  // CORS
  corsOrigin: process.env.BACKEND_CORS_ORIGIN || 'http://localhost:5173',

  // LLM defaults
  llmMaxTokens: parseInt(process.env.LLM_MAX_TOKENS || '256', 10),
  llmTemperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
};
