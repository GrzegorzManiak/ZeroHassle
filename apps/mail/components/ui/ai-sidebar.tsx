import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowsPointingIn, PanelLeftOpen } from '../icons/icons';
import { ResizablePanel } from '@/components/ui/resizable';
import { AIChat, type SimpleAIMessage } from '@/components/create/ai-chat';
import { Button } from '@/components/ui/button';
import { useHotkeys } from 'react-hotkeys-hook';
import { useTRPC } from '@/providers/query-provider';
import { X, Expand } from 'lucide-react';
import { useParams } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { useQueryState } from 'nuqs';
import { cn } from '@/lib/utils';

interface AISidebarProps {
  className?: string;
}

type ViewMode = 'sidebar' | 'popup' | 'fullscreen';

interface ChatHeaderProps {
  onClose: () => void;
  onToggleFullScreen: () => void;
  onToggleViewMode: () => void;
  isFullScreen: boolean;
  isPopup: boolean;
  onNewChat: () => void;
}

function ChatHeader({
  onClose,
  onToggleFullScreen,
  onToggleViewMode,
  isFullScreen,
  isPopup,
  onNewChat,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-2.5 pb-[10px] pt-[13px]">
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={onClose} variant="ghost" className="md:h-fit md:px-2">
              <X className="text-iconLight dark:text-iconDark" />
              <span className="sr-only">Close chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Close chat</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="flex items-center gap-2">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onToggleFullScreen}
                variant="ghost"
                className="hidden md:flex md:h-fit md:px-2"
              >
                {isFullScreen ? (
                  <ArrowsPointingIn className="fill-iconLight dark:fill-iconDark" />
                ) : (
                  <Expand className="text-iconLight dark:text-iconDark" />
                )}
                <span className="sr-only">Toggle full screen</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isFullScreen ? 'Exit full screen' : 'Go full screen'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {!isFullScreen ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onToggleViewMode}
                  variant="ghost"
                  className="hidden md:flex md:h-fit md:px-2"
                >
                  <PanelLeftOpen className="fill-iconLight dark:fill-iconDark" />
                  <span className="sr-only">Toggle view mode</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Go to {isPopup ? 'sidebar' : 'popup'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}

        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={onNewChat} variant="ghost" className="md:h-fit md:px-2">
                New
              </Button>
            </TooltipTrigger>
            <TooltipContent>New chat</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

export function useAIFullScreen() {
  const [isFullScreenQuery, setIsFullScreenQuery] = useQueryState('isFullScreen');

  return {
    isFullScreen: isFullScreenQuery === 'true',
    setIsFullScreen: (value: boolean) => setIsFullScreenQuery(value ? 'true' : null),
  };
}

export function useAISidebar() {
  const [open, setOpenQuery] = useQueryState('aiSidebar');
  const [viewModeQuery, setViewModeQuery] = useQueryState('viewMode');
  const { isFullScreen, setIsFullScreen } = useAIFullScreen();

  const viewMode = (viewModeQuery as ViewMode | null) ?? 'popup';

  return {
    open: open === 'true',
    viewMode,
    setViewMode: (mode: ViewMode) => setViewModeQuery(mode === 'popup' ? null : mode),
    setOpen: (nextOpen: boolean) => setOpenQuery(nextOpen ? 'true' : null),
    toggleOpen: () => setOpenQuery(open === 'true' ? null : 'true'),
    toggleViewMode: () => setViewModeQuery(viewMode === 'popup' ? 'sidebar' : null),
    isFullScreen,
    setIsFullScreen,
    isSidebar: viewMode === 'sidebar',
    isPopup: viewMode === 'popup',
  };
}

function AISidebar({ className }: AISidebarProps) {
  const { open, setOpen, isFullScreen, setIsFullScreen, toggleViewMode, isSidebar, isPopup } =
    useAISidebar();
  const trpc = useTRPC();
  const [threadId] = useQueryState('threadId');
  const [searchValue] = useQueryState('search');
  const { folder } = useParams<{ folder: string }>();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<SimpleAIMessage[]>([]);

  const mutation = useMutation(trpc.ai.chat.mutationOptions());

  useHotkeys('Meta+0', () => {
    setOpen(!open);
  });

  const submitMessage = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt || mutation.isPending) {
      return;
    }

    const userMessage: SimpleAIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
    };

    setMessages((current) => [...current, userMessage]);
    setInput('');

    const response = await mutation.mutateAsync({
      prompt,
      threadId: threadId ?? undefined,
      currentFolder: folder ?? undefined,
      currentFilter: searchValue ?? undefined,
    });

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.text,
      },
    ]);
  }, [folder, input, mutation, searchValue, threadId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setInput('');
  }, []);

  const chat = useMemo(
    () => (
      <AIChat
        messages={messages}
        input={input}
        setInput={setInput}
        onSubmit={submitMessage}
        onClear={clearMessages}
        isLoading={mutation.isPending}
        className={className}
      />
    ),
    [className, clearMessages, input, messages, mutation.isPending, submitMessage],
  );

  if (!open) {
    return null;
  }

  return (
    <>
      {isSidebar && !isFullScreen ? (
        <>
          <div className="w-px opacity-0" />
          <ResizablePanel
            defaultSize={24}
            minSize={24}
            maxSize={28}
            className="bg-panelLight dark:bg-panelDark mb-1 mr-1 hidden h-[calc(100dvh-8px)] shadow-sm md:block md:rounded-2xl"
          >
            <div className={cn('flex h-full flex-col', className)}>
              <ChatHeader
                onClose={() => {
                  setOpen(false);
                  setIsFullScreen(false);
                }}
                onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
                onToggleViewMode={toggleViewMode}
                isFullScreen={isFullScreen}
                isPopup={isPopup}
                onNewChat={clearMessages}
              />
              <div className="relative flex-1 overflow-hidden">{chat}</div>
            </div>
          </ResizablePanel>
        </>
      ) : (
        <div
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4 backdrop-blur-sm transition-opacity duration-150 sm:inset-auto sm:bottom-4 sm:right-4 sm:flex-col sm:items-end sm:justify-end sm:p-0',
            isFullScreen ? 'inset-0! p-0! backdrop-blur-none!' : '',
          )}
        >
          <div
            className={cn(
              'bg-panelLight dark:bg-panelDark flex h-[calc(100dvh-2rem)] w-full max-w-xl flex-col rounded-3xl border shadow-2xl sm:h-[75dvh] sm:w-[28rem]',
              isFullScreen ? 'h-full max-w-none rounded-none' : '',
            )}
          >
            <ChatHeader
              onClose={() => {
                setOpen(false);
                setIsFullScreen(false);
              }}
              onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
              onToggleViewMode={toggleViewMode}
              isFullScreen={isFullScreen}
              isPopup={isPopup}
              onNewChat={clearMessages}
            />
            <div className="relative flex-1 overflow-hidden">{chat}</div>
          </div>
        </div>
      )}
    </>
  );
}

export default AISidebar;
