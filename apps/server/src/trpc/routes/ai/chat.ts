import { createFallbackText, generateOpenRouterText } from '../../../lib/openrouter';
import { getThread, getThreadsFromDB } from '../../../lib/server-utils';
import { activeConnectionProcedure } from '../../trpc';
import { htmlToText } from '../../../thread-workflow-utils/workflow-utils';
import { z } from 'zod';

const buildThreadSnippet = async (connectionId: string, threadId: string) => {
  try {
    const thread = await getThread(connectionId, threadId);
    const latest = thread.result.latest ?? thread.result.messages.at(-1);

    return {
      id: threadId,
      subject: latest?.subject ?? 'No subject',
      from: latest?.sender?.email ?? 'unknown',
      receivedOn: latest?.receivedOn ?? '',
      preview: latest?.decodedBody ? await htmlToText(latest.decodedBody) : '',
    };
  } catch (error) {
    console.error('[ai.chat] Failed to load thread', { connectionId, threadId, error });
    return null;
  }
};

const buildThreadCollection = async ({
  connectionId,
  folder,
  prompt,
}: {
  connectionId: string;
  folder: string;
  prompt: string;
}) => {
  const lowerPrompt = prompt.toLowerCase();
  const inferredQuery = lowerPrompt.includes('invoice')
    ? 'invoice'
    : lowerPrompt.includes('last week')
      ? 'last week'
      : lowerPrompt.includes('today')
        ? 'today'
        : '';

  const threads = await getThreadsFromDB(connectionId, {
    folder,
    maxResults: 10,
  });

  const details = (
    await Promise.all(threads.threads.slice(0, 5).map((thread) => buildThreadSnippet(connectionId, thread.id)))
  ).filter((thread): thread is NonNullable<typeof thread> => Boolean(thread));

  const now = Date.now();
  const filteredThreads = details.filter((thread) => {
    const haystack = `${thread.subject}\n${thread.preview}`.toLowerCase();

    if (lowerPrompt.includes('invoice') && !haystack.includes('invoice')) {
      return false;
    }

    if (lowerPrompt.includes('today')) {
      return thread.receivedOn ? now - new Date(thread.receivedOn).getTime() <= 24 * 60 * 60 * 1000 : false;
    }

    if (lowerPrompt.includes('last week')) {
      return thread.receivedOn ? now - new Date(thread.receivedOn).getTime() <= 7 * 24 * 60 * 60 * 1000 : false;
    }

    return true;
  });

  return {
    inferredQuery,
    threads: (filteredThreads.length ? filteredThreads : details).slice(0, 5),
  };
};

export const chat = activeConnectionProcedure
  .input(
    z.object({
      prompt: z.string().min(1),
      threadId: z.string().optional(),
      currentFolder: z.string().optional(),
      currentFilter: z.string().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const folder = input.currentFolder || 'inbox';

    if (input.threadId) {
      const thread = await getThread(ctx.activeConnection.id, input.threadId);
      const context = await Promise.all(
        thread.result.messages.slice(-6).map(async (message) => {
          const body = message.decodedBody ? await htmlToText(message.decodedBody) : '';
          return [
            `From: ${message.sender.email}`,
            `Subject: ${message.subject}`,
            `Date: ${message.receivedOn}`,
            `Body: ${body.slice(0, 1200)}`,
          ].join('\n');
        }),
      );

      try {
        const text = await generateOpenRouterText({
          messages: [
            {
              role: 'system',
              content:
                'You are a private inbox assistant. Answer briefly in plain text only and do not mention tools.',
            },
            {
              role: 'user',
              content: `User request: ${input.prompt}\n\nThread context:\n${context.join('\n\n')}`,
            },
          ],
        });

        return { text };
      } catch (error) {
        console.error('[ai.chat] Falling back to deterministic thread answer', error);
        return {
          text: createFallbackText('I reviewed the selected thread.', [
            thread.result.latest?.subject ? `Subject: ${thread.result.latest.subject}` : '',
            thread.result.latest?.sender?.email
              ? `Latest sender: ${thread.result.latest.sender.email}`
              : '',
            `Messages reviewed: ${thread.result.messages.length}`,
          ]),
        };
      }
    }

    const collection = await buildThreadCollection({
      connectionId: ctx.activeConnection.id,
      folder,
      prompt: `${input.currentFilter ? `${input.currentFilter}\n` : ''}${input.prompt}`,
    });

    const threadSummary = collection.threads
      .map((thread, index) =>
        [
          `${index + 1}. Subject: ${thread.subject}`,
          `From: ${thread.from}`,
          thread.receivedOn ? `Date: ${thread.receivedOn}` : '',
          thread.preview ? `Preview: ${thread.preview.slice(0, 500)}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      )
      .join('\n\n');

    try {
      const text = await generateOpenRouterText({
        messages: [
          {
            role: 'system',
            content:
              'You are a private inbox assistant. Answer in concise plain text with no markdown headings.',
          },
          {
            role: 'user',
            content: [
              `User request: ${input.prompt}`,
              input.currentFilter ? `Current UI filter: ${input.currentFilter}` : '',
              collection.inferredQuery ? `Applied search query: ${collection.inferredQuery}` : '',
              `Mailbox context:\n${threadSummary || 'No threads available.'}`,
            ]
              .filter(Boolean)
              .join('\n\n'),
          },
        ],
      });

      return {
        text,
        query: collection.inferredQuery || undefined,
      };
    } catch (error) {
      console.error('[ai.chat] Falling back to deterministic mailbox answer', error);
      return {
        text: createFallbackText(
          collection.threads.length
            ? `I reviewed ${collection.threads.length} recent threads.`
            : 'I could not find any recent threads to review.',
          collection.threads.map((thread) => `${thread.subject} from ${thread.from}`),
        ),
        query: collection.inferredQuery || undefined,
      };
    }
  });
