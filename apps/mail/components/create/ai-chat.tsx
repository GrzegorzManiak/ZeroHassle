import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

export type SimpleAIMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export interface AIChatProps {
  messages: SimpleAIMessage[];
  input: string;
  setInput: (value: string) => void;
  onSubmit: () => Promise<void> | void;
  onClear: () => void;
  isLoading: boolean;
  className?: string;
}

export function AIChat({
  messages,
  input,
  setInput,
  onSubmit,
  onClear,
  isLoading,
  className,
}: AIChatProps): JSX.Element {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    const nextValue = editorRef.current?.innerText?.trim() ?? input.trim();
    if (!nextValue) return;

    setInput(nextValue);
    await onSubmit();

    if (editorRef.current) {
      editorRef.current.innerText = '';
    }
  };

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="no-scrollbar flex-1 overflow-y-auto px-3 py-4">
        {!messages.length ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="relative mb-4 h-11 w-11">
              <img src="/black-icon.svg" alt="Zero Logo" className="dark:hidden" />
              <img src="/white-icon.svg" alt="Zero Logo" className="hidden dark:block" />
            </div>
            <p className="text-sm font-medium text-black dark:text-white">Ask about recent mail</p>
            <p className="mt-1 max-w-sm text-sm text-black/50 dark:text-white/50">
              Summaries, recent messages, invoices, and quick mailbox context all route through the
              same local OpenRouter-backed assistant.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                data-message-role={message.role}
                className={cn(
                  'rounded-2xl px-4 py-3 text-sm',
                  message.role === 'user'
                    ? 'ml-auto max-w-[85%] bg-[#111111] text-white dark:bg-white dark:text-black'
                    : 'mr-auto max-w-[90%] bg-[#f3f3f3] text-black dark:bg-[#232323] dark:text-white',
                )}
              >
                <p className="whitespace-pre-wrap leading-6">{message.content}</p>
              </div>
            ))}

            {isLoading ? (
              <div
                data-message-role="assistant"
                className="mr-auto max-w-[90%] rounded-2xl bg-[#f3f3f3] px-4 py-3 text-sm text-black dark:bg-[#232323] dark:text-white"
              >
                zero is thinking...
              </div>
            ) : null}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t px-3 py-3">
        <form
          id="ai-chat-form"
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            await handleSend();
          }}
        >
          <div
            ref={editorRef}
            className="ProseMirror min-h-24 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-[#151515]"
            contentEditable
            suppressContentEditableWarning
            onInput={(event) => setInput(event.currentTarget.innerText)}
            onKeyDown={async (event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                await handleSend();
              }
            }}
          />

          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" onClick={onClear}>
              New chat
            </Button>
            <Button form="ai-chat-form" type="submit" disabled={isLoading}>
              {isLoading ? 'Thinking...' : 'Send'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
