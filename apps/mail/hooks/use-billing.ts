import { useCallback } from 'react';

type FeatureState = {
  total: number;
  remaining: number;
  unlimited: boolean;
  enabled: boolean;
  usage: number;
  nextResetAt: number | null;
  interval: string;
  included_usage: number;
};

const createUnlimitedFeature = (): FeatureState => ({
  total: 0,
  remaining: Number.POSITIVE_INFINITY,
  unlimited: true,
  enabled: true,
  usage: 0,
  nextResetAt: null,
  interval: '',
  included_usage: 0,
});

export const useBilling = () => {
  const noop = useCallback(async () => undefined, []);

  return {
    isLoading: false,
    customer: null,
    refetch: noop,
    attach: noop,
    track: noop,
    openBillingPortal: noop,
    isPro: true,
    chatMessages: createUnlimitedFeature(),
    connections: createUnlimitedFeature(),
    brainActivity: createUnlimitedFeature(),
  };
};
