import { useEffect, useMemo } from 'react';

import type {
  IAgentRecommendationsHookReturn,
  IAgentRecommendationsProps,
  IProduct,
} from '@src/types';

import { createRecommendationsClient } from '../services/agentRecommendationsClient';

import useRecommendationsData from './useRecommendationsData';
import useRecommendationsTracking from './useRecommendationsTracking';
import useViewportTracking from './useViewportTracking';

/**
 * One client for the requests and the tracking, so both carry the same shopper identity and test
 * cells. The cells are compared by value, so an inline object does not rebuild the client.
 */
function useClient(
  apiKey: string | undefined,
  cioJsClient: IAgentRecommendationsProps['cioJsClient'],
  testCells: Record<string, string> | undefined
) {
  const serializedTestCells = JSON.stringify(testCells ?? null);
  const client = useMemo(
    () =>
      apiKey || cioJsClient
        ? createRecommendationsClient({ apiKey, cioJsClient, testCells })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiKey, cioJsClient, serializedTestCells]
  );

  // A caller's client owns its own options, so say so rather than dropping the cells silently.
  useEffect(() => {
    if (!cioJsClient || !testCells || Object.keys(testCells).length === 0) {
      return;
    }
    console.warn(
      '[CioAgentRecommendations] abTest.testCells is ignored when you supply your own cioJsClient. Set testCells on that client instead.'
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cioJsClient, serializedTestCells]);

  return client;
}

/**
 * Hook behind CioAgentRecommendations: it loads the pod for a product, reloads it for each refinement,
 * and sends the pod's behavioral tracking events, so a pod you render yourself behaves like the
 * component.
 *
 * Sent for you: one AnswerView per settled response, and a QuestionClick from `refine`. Attach
 * `containerRef` to your pod's outermost element for the view events, and call `trackProductClick`
 * from your product links.
 *
 * @example
 * ```tsx
 * const { title, products, refine, refinementOptions, containerRef, trackProductClick } =
 *   useAgentRecommendations({
 *     apiKey: 'YOUR_API_KEY',
 *     itemId: '119801',
 *     itemName: 'Hide & Seek Wallet',
 *     strategy: 'complementary_pod',
 *   });
 * ```
 */
export default function useAgentRecommendations(
  props: IAgentRecommendationsProps
): IAgentRecommendationsHookReturn {
  const { apiKey, cioJsClient, callbacks, abTest } = props;
  const isControl = !!abTest?.isControl;
  const client = useClient(apiKey, cioJsClient, abTest?.testCells);
  const state = useRecommendationsData({
    ...props,
    cioJsClient: client ?? undefined,
  });
  const { title, products, refinementOptions, activeRefinement, resultId } =
    state;

  const tracking = useRecommendationsTracking({
    client,
    strategy: props.strategy,
    itemId: props.itemId,
    itemName: props.itemName,
    variationId: props.variationId,
    threadId: state.threadId,
  });
  const hasContent = !!resultId && products.length > 0;
  const containerRef = useViewportTracking({
    tracking,
    options: refinementOptions,
    // The control arm's placeholder has nothing to load, so its view counts as soon as it is seen.
    hasContent: isControl || hasContent,
    viewThreshold: props.trackingConfigs?.viewThreshold,
  });

  // It reports the data, not the markup, so it fires whatever renders the pod.
  useEffect(() => {
    if (!hasContent || isControl) return;
    tracking.trackAnswerView({
      title,
      refinement: activeRefinement,
      products,
      options: refinementOptions,
      resultId,
    });
    // Keyed on the response alone: the other values change with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultId]);

  const refine = (option: string) => {
    tracking.trackQuestionClick(option);
    callbacks?.onRefinementClick?.(option);
    state.refine(option);
  };

  const trackProductClick = (product: IProduct, index: number) =>
    tracking.trackResultClick(product, index, activeRefinement, resultId);

  return { ...state, refine, trackProductClick, containerRef };
}
