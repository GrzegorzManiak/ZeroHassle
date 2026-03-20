import { generateOpenRouterText } from '../../../lib/openrouter';
import { activeConnectionProcedure } from '../../trpc';
import { stripHtml } from 'string-strip-html';
import { z } from 'zod';

export const composeEmail = async ({
  prompt,
  emailSubject,
  to,
  cc,
  threadMessages = [],
  username,
}: {
  prompt: string;
  emailSubject?: string;
  to?: string[];
  cc?: string[];
  threadMessages?: Array<{
    from: string;
    to: string[];
    cc?: string[];
    subject: string;
    body: string;
  }>;
  username: string;
  connectionId?: string;
}) => {
  const threadContext = threadMessages
    .map((message) =>
      [
        `From: ${message.from}`,
        `To: ${message.to.join(', ')}`,
        message.cc?.length ? `CC: ${message.cc.join(', ')}` : '',
        `Subject: ${message.subject}`,
        `Body: ${stripHtml(message.body).result}`,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n');

  return await generateOpenRouterText({
    messages: [
      {
        role: 'system',
        content:
          'Write a polished email reply in plain text or simple HTML. Return only the email body with no markdown fences.',
      },
      {
        role: 'user',
        content: EmailAssistantPrompt({
          currentSubject: emailSubject,
          recipients: [...(to ?? []), ...(cc ?? [])],
          prompt,
          username,
          threadContext,
        }),
      },
    ],
    temperature: 0.3,
    maxTokens: 1200,
  });
};

export const compose = activeConnectionProcedure
  .input(
    z.object({
      prompt: z.string(),
      emailSubject: z.string().optional(),
      to: z.array(z.string()).optional(),
      cc: z.array(z.string()).optional(),
      threadMessages: z
        .array(
          z.object({
            from: z.string(),
            to: z.array(z.string()),
            cc: z.array(z.string()).optional(),
            subject: z.string(),
            body: z.string(),
          }),
        )
        .optional()
        .default([]),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const newBody = await composeEmail({
      prompt: input.prompt,
      emailSubject: input.emailSubject,
      to: input.to,
      cc: input.cc,
      threadMessages: input.threadMessages,
      username: ctx.sessionUser.name,
    });

    return { newBody };
  });

export const generateEmailSubject = activeConnectionProcedure
  .input(
    z.object({
      message: z.string(),
    }),
  )
  .mutation(async ({ input }) => {
    const subject = await generateOpenRouterText({
      messages: [
        {
          role: 'system',
          content: 'Write a concise email subject line. Return only the subject text.',
        },
        {
          role: 'user',
          content: input.message,
        },
      ],
      maxTokens: 60,
    });

    return {
      subject: subject.replace(/^subject:\s*/i, '').trim(),
    };
  });

const EmailAssistantPrompt = ({
  currentSubject,
  recipients,
  prompt,
  username,
  threadContext,
}: {
  currentSubject?: string;
  recipients?: string[];
  prompt: string;
  username: string;
  threadContext?: string;
}) => {
  const parts: string[] = [];

  parts.push('Write an email for the user.');

  if (currentSubject?.trim()) {
    parts.push(`Current subject: ${currentSubject.trim()}`);
  }

  if (recipients?.length) {
    parts.push(`Recipients: ${recipients.join(', ')}`);
  }

  if (threadContext?.trim()) {
    parts.push(`Thread context:\n${threadContext}`);
  }

  parts.push(`User name: ${username}`);
  parts.push(`Instruction:\n${prompt}`);
  parts.push('Return only the body of the email.');

  return parts.join('\n\n');
};
