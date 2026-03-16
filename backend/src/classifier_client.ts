import axios from 'axios';
import { config } from './config';

export interface ClassifyResult {
  tone: string;
  confidence: number;
  notes: string;
}

/**
 * Calls the tone classifier service to analyze the style of a message.
 * Falls back to 'neutral' if the service is unavailable.
 */
export async function classify(text: string): Promise<ClassifyResult> {
  try {
    const response = await axios.post(
      `${config.classifierServiceUrl}/classify`,
      { text },
      { timeout: 10000 }
    );
    return response.data as ClassifyResult;
  } catch (error: any) {
    console.error('[Classifier] Service error, defaulting to neutral:', error.message);
    return {
      tone: 'neutral',
      confidence: 0.0,
      notes: 'classifier service unavailable — fallback',
    };
  }
}
