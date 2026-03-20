import { createFallbackText, generateOpenRouterText } from '../../../lib/openrouter';
import { getThread } from '../../../lib/server-utils';
import { activeConnectionProcedure } from '../../trpc';
import { htmlToText } from '../../../thread-workflow-utils/workflow-utils';
import { z } from 'zod';

export const generateSummary = activeConnectionProcedure
  .input(
    z.object({
      threadId: z.string(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const thread = await getThread(ctx.activeConnection.id, input.threadId);
    const messages = await Promise.all(
      thread.result.messages.slice(-8).map(async (message) => {
        const body = message.decodedBody ? await htmlToText(message.decodedBody) : '';
        return [
          `From: ${message.sender.email}`,
          `Subject: ${message.subject}`,
          `Date: ${message.receivedOn}`,
          `Body: ${body.slice(0, 1500)}`,
        ].join('\n');
      }),
    );

    try {
      const short = await generateOpenRouterText({
        messages: [
          {
            role: 'system',
            content:
              'Summarize this email thread in 3 short bullet points. Use plain text only and keep the output short.',
          },
          {
            role: 'user',
            content: messages.join('\n\n'),
          },
        ],
        maxTokens: 250,
      });

      return {
        data: {
          short,
        },
      };
    } catch (error) {
      console.error('[ai.generateSummary] Falling back to deterministic summary', error);
      return {
        data: {
          short: createFallbackText('Recent thread summary:', [
            thread.result.latest?.subject ? `Subject: ${thread.result.latest.subject}` : '',
            thread.result.latest?.sender?.email
              ? `Latest sender: ${thread.result.latest.sender.email}`
              : '',
            `Messages: ${thread.result.messages.length}`,
          ]),
        },
      };
    }
  });
