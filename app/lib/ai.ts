import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

const groq = createOpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

export function hasAIProvider(): boolean {
  return Boolean(process.env.GROQ_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

export function getAIModel(): LanguageModel {
  if (process.env.GROQ_API_KEY) {
    return groq(process.env.GROQ_MODEL || 'openai/gpt-oss-20b');
  }

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return google(process.env.GOOGLE_GENERATIVE_AI_MODEL || 'gemini-2.5-flash');
  }

  throw new Error('AI provider is not configured');
}
