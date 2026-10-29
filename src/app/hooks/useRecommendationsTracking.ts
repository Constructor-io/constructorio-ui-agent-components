// cspell:ignore timespans Timespans -- the tracker API's own field name, viewTimespans
import { useCallback, useMemo } from 'react';

import type ConstructorIOClient from '@constructor-io/constructorio-client-javascript';

import type { IProduct } from '@src/types';
import { withLibraryTag } from '@src/utils/libraryTag';

export interface TimeSpan {
  start: string;
  end: string;
}

interface UseRecommendationsTrackingProps {
  client: ConstructorIOClient | null;
  /**
   * Sent as `question` on a turn with no refinement. The behavioral API rejects an empty `question`,
   * and the strategy still tells a base turn apart from a refinement.
   */
  strategy: string;
  itemId: string;
  itemName: string;
  variationId?: string;
  threadId: string | null;
}

/** A settled pod response, as the AnswerView event reports it. */
export interface TrackedAnswer {
  title: string;
  refinement: string | null;
  products: IProduct[];
  options: string[];
  resultId: string | null;
}

export interface UseRecommendationsTrackingReturn {
  trackView: (options: string[]) => void;
  trackViews: (options: string[], viewTimespans: TimeSpan[]) => void;
  trackOutOfView: () => void;
  trackAnswerView: (answer: TrackedAnswer) => void;
  trackQuestionClick: (option: string) => void;
  trackResultClick: (
    product: IProduct,
    position: number,
    refinement: string | null,
    resultId: string | null
  ) => void;
}

/**
 * The pod's behavioral tracking events, sent with the Product Insights Agent tracker methods as the
 * Agentic Prism Recommendations spec lists them. Events carry this library's client tag even on a
 * host-supplied client.
 */
export default function useRecommendationsTracking({
  client,
  strategy,
  itemId,
  itemName,
  variationId,
  threadId,
}: UseRecommendationsTrackingProps): UseRecommendationsTrackingReturn {
  const hostTracker = client?.tracker;
  const tracker = useMemo(
    () => hostTracker && withLibraryTag(hostTracker),
    [hostTracker]
  );

  const baseParams = useMemo(
    () => ({
      itemId,
      itemName,
      ...(variationId && { variationId }),
      ...(threadId && { threadId }),
    }),
    [itemId, itemName, variationId, threadId]
  );

  const trackView = useCallback(
    (options: string[]) => {
      tracker?.trackProductInsightsAgentView({
        ...baseParams,
        questions: options.map((question) => ({ question })),
      });
    },
    [tracker, baseParams]
  );

  const trackViews = useCallback(
    (options: string[], viewTimespans: TimeSpan[]) => {
      tracker?.trackProductInsightsAgentViews({
        ...baseParams,
        questions: options.map((question) => ({ question })),
        viewTimespans,
      });
    },
    [tracker, baseParams]
  );

  const trackOutOfView = useCallback(() => {
    tracker?.trackProductInsightsAgentOutOfView(baseParams);
  }, [tracker, baseParams]);

  const trackAnswerView = useCallback(
    ({ title, refinement, products, options, resultId }: TrackedAnswer) => {
      tracker?.trackProductInsightsAgentAnswerView({
        ...baseParams,
        question: refinement || strategy,
        answerText: title,
        ...(resultId && { qnaResultId: resultId }),
        ...(products.length > 0 && {
          items: products.map((product) => ({
            itemId: product.itemId ?? product.url,
            itemName: product.itemName,
            ...(product.variationId && { variationId: product.variationId }),
          })),
        }),
        ...(options.length > 0 && {
          followUpQuestions: options.map((value) => ({ value })),
        }),
      });
    },
    [tracker, baseParams, strategy]
  );

  const trackQuestionClick = useCallback(
    (option: string) => {
      tracker?.trackProductInsightsAgentQuestionClick({
        ...baseParams,
        question: option,
      });
    },
    [tracker, baseParams]
  );

  const trackResultClick = useCallback(
    (
      product: IProduct,
      position: number,
      refinement: string | null,
      resultId: string | null
    ) => {
      // trackProductInsightsAgentResultClick first shipped in client 2.88.0, newer than this
      // library's minimum, so an older client skips the event rather than throwing.
      if (typeof tracker?.trackProductInsightsAgentResultClick !== 'function') {
        return;
      }
      tracker.trackProductInsightsAgentResultClick({
        itemId: product.itemId ?? product.url,
        itemName: product.itemName,
        ...(product.variationId && { variationId: product.variationId }),
        question: refinement || strategy,
        seedItemId: itemId,
        seedItemName: itemName,
        ...(variationId && { seedVariationId: variationId }),
        ...(resultId && { qnaResultId: resultId }),
        ...(threadId && { threadId }),
        position,
      });
    },
    [tracker, strategy, itemId, itemName, variationId, threadId]
  );

  return useMemo(
    () => ({
      trackView,
      trackViews,
      trackOutOfView,
      trackAnswerView,
      trackQuestionClick,
      trackResultClick,
    }),
    [
      trackView,
      trackViews,
      trackOutOfView,
      trackAnswerView,
      trackQuestionClick,
      trackResultClick,
    ]
  );
}
