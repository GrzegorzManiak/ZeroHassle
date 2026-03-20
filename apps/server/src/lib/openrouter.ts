import { env } from '../env';
import { jsonrepair } from 'jsonrepair';

type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

const toText = (content: unknown) => {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }
        if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') {
          return part.text;
        }
        return '';
      })
      .join('\n');
  }

  return '';
};

const stripJsonFences = (value: string) =>
  value
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

export const createFallbackText = (title: string, bullets: string[]) => {
  const visibleBullets = bullets.filter(Boolean).slice(0, 5);

  if (!visibleBullets.length) {
    return title;
  }

  return `${title}\n\n${visibleBullets.map((bullet) => `- ${bullet}`).join('\n')}`;
};

export const generateOpenRouterText = async ({
  messages,
  temperature = 0.2,
  maxTokens = 700,
}: {
  messages: OpenRouterMessage[];
  temperature?: number;
  maxTokens?: number;
}) => {
  if (!env.OPENROUTER_API_KEY || !env.OPENROUTER_MODEL) {
    throw new Error('OpenRouter is not configured');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.VITE_PUBLIC_APP_URL,
      'X-Title': 'ZeroHassle',
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter request failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: unknown;
      };
    }>;
  };

  const text = toText(payload.choices?.[0]?.message?.content).trim();

  if (!text) {
    throw new Error('OpenRouter returned an empty response');
  }

  return text;
};

export const generateOpenRouterJson = async <T>({
  messages,
  temperature = 0,
  maxTokens = 300,
}: {
  messages: OpenRouterMessage[];
  temperature?: number;
  maxTokens?: number;
}) => {
  const text = await generateOpenRouterText({
    messages,
    temperature,
    maxTokens,
  });

  return JSON.parse(jsonrepair(stripJsonFences(text))) as T;
};
