import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  IAgentRecommendationsProps,
  IAgentRecommendationsRenderProps,
} from '@src/types';
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

/** What the settled response puts on screen, or empty values before one settles. */
function settledState(current: Settled | null) {
  const result = current?.result ?? null;
  return {
    result,
    products: result?.products ?? [],
    refinementOptions: result?.refinementOptions ?? [],
    activeRefinement: current?.refinement ?? null,
    error: current?.error ?? null,
    resultId: result?.resultId ?? null,
    threadId: result?.threadId ?? null,
  };
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
 * The pod's data: one request for the product, one per refinement, and the state on screen.
 *
 * The previous products stay on screen while a refinement loads, so the row swaps its contents
 * instead of collapsing. A request superseded by a newer one is aborted and its result dropped.
 * Internal: useAgentRecommendations adds the shared client and the tracking on top of it.
 */
export default function useRecommendationsData(
  props: IAgentRecommendationsProps
): IAgentRecommendationsRenderProps {
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
  // A control-group shopper never sees the pod, so it never asks for one.
  const canLoad = !!itemId && !!strategy && !props.abTest?.isControl;

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

  const { result, ...onScreen } = settledState(current);

  return {
    ...onScreen,
    title: resolveTitle(result, defaultTitle, translations),
    refine,
    isLoading,
  };
}
