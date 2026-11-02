import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  IAgentOverviewError,
  IAgentOverviewProps,
  IAgentOverviewSection,
  IProduct,
  UseAgentOverviewReturn,
} from '@src/types';
import toProduct from '@src/utils/toProduct';

import { AgentInsightsRequestError } from '../services/agentInsightsClient';
import type { AgentInsightsEvent } from '../services/agentInsightsTypes';
import {
  createAgentOverviewClient,
  streamAgentOverview,
} from '../services/agentOverviewClient';

import useAgentOverviewTracking, {
  type TrackedOverview,
} from './useAgentOverviewTracking';

/** The HTTP status the search endpoint answers when a query gets no overview. */
const NO_OVERVIEW_STATUS = 422;
/** How much of a product card must be on screen for its set to count as viewed. */
const VIEW_THRESHOLD = 0.5;
/** The component's product cards, one per product in the order of `sections`. */
const CARD_SELECTOR = '.cio-agent-overview-product-card';

type OverviewState = Omit<
  UseAgentOverviewReturn,
  'trackProductClick' | 'viewRef'
>;

function initialState(query: string): OverviewState {
  return {
    status: query.trim() ? 'loading' : 'idle',
    message: '',
    sections: [],
    resultId: null,
    threadId: null,
    error: null,
  };
}

function toError(err: unknown): IAgentOverviewError {
  if (err instanceof AgentInsightsRequestError) {
    return {
      status: err.status,
      ...(err.code && { code: err.code }),
      message: err.message,
    };
  }
  return {
    status: 0,
    message: err instanceof Error ? err.message : String(err),
  };
}

/** A product set from one `item_results` event, or null when none of its products can be shown. */
function toSection(
  event: Extract<AgentInsightsEvent, { type: 'item_results' }>
): IAgentOverviewSection | null {
  const products = event.results
    .map(toProduct)
    .filter((product): product is IProduct => product !== null);
  if (products.length === 0) return null;
  const title = event.title.trim();
  // A set the API sent as one product is one category of a multi-category overview: label the
  // card with it. Decided on what the API sent, not on what survives filtering.
  const labelled =
    event.results.length === 1 && title
      ? [{ ...products[0], label: title }]
      : products;
  return {
    title,
    ...(event.searchResultId && { searchResultId: event.searchResultId }),
    products: labelled,
  };
}

function isAbort(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

/**
 * Calls one of the site's callbacks. An exception in the site's code is logged, so it can't be
 * taken for a failed request.
 */
function notify(callback: () => void): void {
  try {
    callback();
  } catch (err) {
    console.error('CioAgentOverview: a callback threw', err);
  }
}

/**
 * Streams the AI Overview for `query` from `/v1/agent_insights/search`: the overview message,
 * then each product set as it arrives. A new query aborts the previous request.
 *
 * Sends the overview's tracking events: submit, load started and load finished on its own; a
 * view for each product set once the element given to `viewRef` is half on screen; and a click
 * when you call `trackProductClick`.
 *
 * @example
 * ```tsx
 * const { status, message, sections, viewRef, trackProductClick } = useAgentOverview({
 *   apiKey: 'YOUR_API_KEY',
 *   query,
 * });
 * ```
 */
export default function useAgentOverview(
  props: IAgentOverviewProps
): UseAgentOverviewReturn {
  const { apiKey, cioJsClient, pageContext, callbacks } = props;
  // The JavaScript bundle has no types: treat a missing query as a blank one.
  const query = props.query ?? '';
  const pageType = pageContext?.pageType;
  const searchTerm = pageContext?.searchTerm;

  const client = useMemo(
    () => createAgentOverviewClient({ apiKey, cioJsClient }),
    [apiKey, cioJsClient]
  );
  const tracking = useAgentOverviewTracking(client, query);

  const [state, setState] = useState(() => initialState(query));

  // A new request starts from a clean state in the same render, so no frame shows the previous
  // query's overview (React's "adjusting state when a prop changes").
  const request = { client, query, pageType, searchTerm };
  const [lastRequest, setLastRequest] = useState(request);
  if (
    lastRequest.client !== client ||
    lastRequest.query !== query ||
    lastRequest.pageType !== pageType ||
    lastRequest.searchTerm !== searchTerm
  ) {
    setLastRequest(request);
    setState(initialState(query));
  }

  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  // What view and click events need, read from callbacks that outlive a render.
  const overviewRef = useRef<TrackedOverview | null>(null);
  const sectionsRef = useRef<IAgentOverviewSection[]>([]);
  const viewedRef = useRef(new Set<IAgentOverviewSection>());
  const containerRef = useRef<HTMLElement | null>(null);
  const containerInViewRef = useRef(false);
  const visibleCardsRef = useRef(new Set<Element>());
  const observedCardsRef = useRef(new WeakSet<Element>());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const trackingRef = useRef(tracking);

  // A set counts as viewed once one of its cards is half on screen: with several sets in one
  // carousel, the ones scrolled out of sight aren't. An element without the component's cards
  // (a custom UI) counts as a whole.
  const sendViews = useCallback(() => {
    const overview = overviewRef.current;
    const container = containerRef.current;
    if (!overview || !container) return;

    const cards = Array.from(container.querySelectorAll(CARD_SELECTOR));
    const sectionOfCard = sectionsRef.current.flatMap((section) =>
      section.products.map(() => section)
    );
    const visible =
      cards.length === 0
        ? containerInViewRef.current
          ? sectionsRef.current
          : []
        : cards.flatMap((card, index) =>
            visibleCardsRef.current.has(card) && sectionOfCard[index]
              ? [sectionOfCard[index]]
              : []
          );

    visible.forEach((section) => {
      if (viewedRef.current.has(section)) return;
      viewedRef.current.add(section);
      trackingRef.current.trackSectionView(overview, section);
    });
  }, []);

  // Cards arrive with the stream, after the element was attached.
  const observeCards = useCallback(() => {
    const container = containerRef.current;
    const observer = observerRef.current;
    if (!container || !observer) return;
    container.querySelectorAll(CARD_SELECTOR).forEach((card) => {
      if (observedCardsRef.current.has(card)) return;
      observedCardsRef.current.add(card);
      observer.observe(card);
    });
  }, []);

  useEffect(() => {
    trackingRef.current = tracking;
    overviewRef.current = state.resultId
      ? { resultId: state.resultId, threadId: state.threadId }
      : null;
    sectionsRef.current = state.sections;
    observeCards();
    sendViews();
  }, [
    tracking,
    state.resultId,
    state.threadId,
    state.sections,
    observeCards,
    sendViews,
  ]);

  useEffect(() => {
    viewedRef.current = new Set();
    if (!query.trim()) return undefined;

    const controller = new AbortController();
    const isCurrent = () => !controller.signal.aborted;
    const update = (patch: Partial<OverviewState>) => {
      if (isCurrent()) setState((prev) => ({ ...prev, ...patch }));
    };

    // Outside run() so a stream that breaks off can still finish with what already arrived.
    const sections: IAgentOverviewSection[] = [];
    let overview: TrackedOverview | null = null;
    const productCount = () =>
      sections.reduce((count, section) => count + section.products.length, 0);

    async function run() {
      const messages: string[] = [];
      let serverError: IAgentOverviewError | null = null;

      for await (const event of streamAgentOverview(
        client,
        {
          query,
          pageContext:
            pageType || searchTerm !== undefined
              ? { pageType, searchTerm }
              : undefined,
        },
        controller.signal,
        () => {
          if (isCurrent()) tracking.trackSubmit();
        }
      )) {
        if (!isCurrent()) return;
        if (event.type === 'start') {
          overview = {
            resultId: event.resultId,
            threadId: event.threadId ?? null,
          };
          tracking.trackLoadStarted(overview);
          update({
            status: 'streaming',
            resultId: overview.resultId,
            threadId: overview.threadId,
          });
        } else if (event.type === 'message') {
          messages.push(event.text);
          update({ message: messages.join('\n\n') });
        } else if (event.type === 'item_results') {
          const section = toSection(event);
          if (section) {
            sections.push(section);
            update({ sections: [...sections] });
          }
        } else if (event.type === 'server_error') {
          serverError = { status: event.statusCode, message: event.message };
        } else if (event.type === 'end') {
          break;
        }
      }

      if (!isCurrent()) return;
      if (overview) tracking.trackLoadFinished(overview, productCount());
      if (sections.length > 0) {
        update({ status: 'done' });
      } else if (serverError) {
        update({ status: 'error', error: serverError });
        notify(() => callbacksRef.current?.onError?.(serverError));
      } else {
        update({ status: 'no-overview' });
        notify(() => callbacksRef.current?.onNoOverview?.());
      }
    }

    run().catch((err: unknown) => {
      if (!isCurrent() || isAbort(err)) return;
      // The connection dropped after products were shown: keep them.
      if (overview) tracking.trackLoadFinished(overview, productCount());
      if (sections.length > 0) {
        update({ status: 'done' });
        return;
      }
      if (
        err instanceof AgentInsightsRequestError &&
        err.status === NO_OVERVIEW_STATUS
      ) {
        update({ status: 'no-overview' });
        notify(() => callbacksRef.current?.onNoOverview?.());
        return;
      }
      const error = toError(err);
      update({ status: 'error', error });
      notify(() => callbacksRef.current?.onError?.(error));
    });

    return () => controller.abort();
  }, [client, query, pageType, searchTerm, tracking]);

  const viewRef = useCallback(
    (node: HTMLElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      containerRef.current = node;
      containerInViewRef.current = false;
      visibleCardsRef.current = new Set();
      observedCardsRef.current = new WeakSet();
      if (!node || typeof IntersectionObserver === 'undefined') return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const visible =
              entry.isIntersecting && entry.intersectionRatio >= VIEW_THRESHOLD;
            if (entry.target === node) {
              containerInViewRef.current = visible;
            } else if (visible) {
              visibleCardsRef.current.add(entry.target);
            } else {
              visibleCardsRef.current.delete(entry.target);
            }
          });
          sendViews();
        },
        { threshold: VIEW_THRESHOLD }
      );
      observer.observe(node);
      observerRef.current = observer;
      observeCards();
    },
    [observeCards, sendViews]
  );

  const trackProductClick = useCallback(
    (product: IProduct, section: IAgentOverviewSection) => {
      const overview = overviewRef.current;
      if (overview)
        trackingRef.current.trackProductClick(overview, product, section);
    },
    []
  );

  return { ...state, trackProductClick, viewRef };
}
