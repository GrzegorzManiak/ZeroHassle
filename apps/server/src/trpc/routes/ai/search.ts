import { GmailSearchAssistantSystemPrompt } from '../../../lib/prompts';
import { generateOpenRouterText } from '../../../lib/openrouter';
import { activeDriverProcedure } from '../../trpc';
import { z } from 'zod';

export const generateSearchQuery = activeDriverProcedure
  .input(z.object({ query: z.string() }))
  .mutation(async ({ input }) => {
    try {
      const query = await generateOpenRouterText({
        messages: [
          {
            role: 'system',
            content: `${GmailSearchAssistantSystemPrompt()}\nReturn only the final search query with no explanation.`,
          },
          {
            role: 'user',
            content: input.query,
          },
        ],
        maxTokens: 120,
      });

      return {
        query: query.trim(),
      };
    } catch (error) {
      console.error('[ai.generateSearchQuery] Falling back to raw query', error);
      return {
        query: input.query.trim(),
      };
    }
  });
