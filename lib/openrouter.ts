// Server-only — never import this from a client component
import OpenAI from 'openai'

export const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://openadvisor.app',
    'X-Title': 'OpenAdvisor',
  },
})

export const DEFAULT_MODEL = process.env.DEFAULT_MODEL ?? 'openai/gpt-4o-mini'
