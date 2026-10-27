import { useCallback, useEffect, useRef, useState } from 'react';

import type { IAgentRecommendationsProps, IProduct } from '@src/types';
import translate from '@src/utils/translate';

import {
  fetchRecommendations,
  type RecommendationsResult,
} from '../services/agentRecommendationsClient';

/** The last request that settled, tagged with the pod it belongs to. */
interface Settled {
  podKey: string;
  result: RecommendationsResult | null;
  refinement: string | null;
  error: string | null;
}

/**
 * The title for a settled response. A degraded response's title cannot be trusted, but its
 * products are still worth showing, so it falls back like a response with no title.
 */
function resolveTitle(
  result: RecommendationsResult | null,
  defaultTitle: string | undefined,
  translations: IAgentRecommendationsProps['translations']
): string {
  if (!result) return defaultTitle || '';
  if (result.title && result.status !== 'partial') return result.title;
  return (
    defaultTitle ||
    translate('CioAgentRecommendations.fallbackTitle', translations)
  );
}

/** A failed refinement leaves the products already on screen in place. */
function withError(
  previous: Settled | null,
  podKey: string,
  error: string,
  isRefinement: boolean
): Settled {
  return previous?.podKey === podKey && isRefinement
    ? { ...previous, error }
    : { podKey, result: null, refinement: null, error };
}

/**
 * Hook that loads a recommendations pod for a product and reloads it for each refinement option
 * the shopper picks.
 *
 * The previous products stay on screen while a refinement loads, so the row swaps its contents
 * instead of collapsing. A request superseded by a newer one is aborted and its result dropped.
 *
 * @example
 * ```tsx
 * const { title, products, refinementOptions, refine, isLoading } =
 *   useAgentRecommendations({ apiKey: 'YOUR_API_KEY', itemId: '119801', strategy: 'complementary_pod' });
 * ```
 */
export default function useAgentRecommendations(
  props: IAgentRecommendationsProps
): {
  /** The pod title for the response on screen. Empty until the first response settles. */
  title: string;
  products: IProduct[];
  refinementOptions: string[];
  /** The option behind the products on screen, or `null` before any refinement. */
  activeRefinement: string | null;
  /** Reloads the pod for one of `refinementOptions`. */
  refine: (option: string) => void;
  isLoading: boolean;
  error: string | null;
} {
  const {
    apiKey,
    cioJsClient,
    itemId,
    variationId,
    strategy,
    defaultTitle,
    translations,
  } = props;
  // Identifies one pod. A change starts a new pod: nothing from the previous one's thread carries over.
  const podKey = JSON.stringify([itemId, variationId, strategy, defaultTitle]);
  const canLoad = !!itemId && !!strategy;

  const [settled, setSettled] = useState<Settled | null>(null);
  const [pendingRefinement, setPendingRefinement] = useState<{
    podKey: string;
    option: string;
  } | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const request = useCallback(
    (shopperInput?: string, threadId?: string) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      fetchRecommendations(
        { apiKey, cioJsClient },
        { itemId, variationId, strategy, defaultTitle, shopperInput, threadId },
        controller.signal
      )
        .then((result) => {
          if (controller.signal.aborted) return;
          setSettled({
            podKey,
            result,
            refinement: shopperInput ?? null,
            error: null,
          });
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          const error =
            err instanceof Error
              ? err.message
              : 'Failed to load recommendations';
          setSettled((previous) =>
            withError(previous, podKey, error, !!shopperInput)
          );
        })
        .finally(() => {
          if (controller.signal.aborted) return;
          setPendingRefinement(null);
        });
    },
    [apiKey, cioJsClient, itemId, variationId, strategy, defaultTitle, podKey]
  );

  useEffect(() => {
    if (!canLoad) return undefined;
    request();
    return () => controllerRef.current?.abort();
  }, [canLoad, request]);

  const current = settled?.podKey === podKey ? settled : null;

  const refine = useCallback(
    (option: string) => {
      const text = option.trim();
      if (!text) return;
      setPendingRefinement({ podKey, option: text });
      request(text, current?.result?.threadId);
    },
    [podKey, request, current?.result?.threadId]
  );

  const isLoading =
    canLoad && (!current || pendingRefinement?.podKey === podKey);

  const result = current?.result ?? null;

  return {
    title: resolveTitle(result, defaultTitle, translations),
    products: result?.products ?? [],
    refinementOptions: result?.refinementOptions ?? [],
    activeRefinement: current?.refinement ?? null,
    refine,
    isLoading,
    error: current?.error ?? null,
  };
}
