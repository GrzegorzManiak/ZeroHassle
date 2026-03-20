import { useTRPC } from '@/providers/query-provider';
import { useQuery } from '@tanstack/react-query';

export const useSummary = (threadId: string | null) => {
  const trpc = useTRPC();
  const summaryQuery = useQuery(
    trpc.ai.generateSummary.queryOptions(
      { threadId: threadId! },
      {
        enabled: !!threadId,
      },
    ),
  );

  return summaryQuery;
};

export const useBrainState = () => {
  return {
    data: { enabled: true },
    isLoading: false,
  };
};
