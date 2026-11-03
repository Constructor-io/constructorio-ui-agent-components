import { useMemo } from 'react';

import type ConstructorIOClient from '@constructor-io/constructorio-client-javascript';

import type { IAgentOverviewSection, IProduct } from '@src/types';
import { withLibraryTag } from '@src/utils/libraryTag';

import { AGENT_OVERVIEW_CLIENT_TAG } from '../services/agentOverviewClient';

/** The overview the events are about. */
export interface TrackedOverview {
  resultId: string;
  threadId: string | null;
}

export interface AgentOverviewTracking {
  trackSubmit: () => void;
  trackLoadStarted: (overview: TrackedOverview) => void;
  trackLoadFinished: (
    overview: TrackedOverview,
    searchResultCount: number
  ) => void;
  trackSectionView: (
    overview: TrackedOverview,
    section: IAgentOverviewSection
  ) => void;
  trackProductClick: (
    overview: TrackedOverview,
    product: IProduct,
    section: IAgentOverviewSection
  ) => void;
}

type AgentTracker = Partial<
  Pick<
    ConstructorIOClient['tracker'],
    | 'trackAgentSubmit'
    | 'trackAgentResultLoadStarted'
    | 'trackAgentResultLoadFinished'
    | 'trackAgentResultView'
    | 'trackAgentResultClick'
  >
>;

function overviewParams(query: string, overview: TrackedOverview) {
  return {
    intent: query,
    intentResultId: overview.resultId,
    ...(overview.threadId && { threadId: overview.threadId }),
  };
}

/** Sends one event. A tracker exception is logged, so tracking can't stop the overview rendering. */
function send(event: () => void): void {
  try {
    event();
  } catch (err) {
    console.error('CioAgentOverview: tracking failed', err);
  }
}

/**
 * AI Overview's behavioral events, as the AI Overview tracking contract lists them, sent with the
 * JS client's agent tracker methods. Events carry `cio-ui-agent-overview-<version>` as their client
 * tag, even on a host's client. A method the client lacks is skipped, and so is a view or click on
 * a product set without a `searchResultId`, or a click on a product without a catalog id, which
 * those events require.
 */
export default function useAgentOverviewTracking(
  client: ConstructorIOClient,
  query: string
): AgentOverviewTracking {
  const hostTracker = (client as { tracker?: object }).tracker;

  return useMemo(() => {
    const tracker: AgentTracker | undefined =
      hostTracker && withLibraryTag(hostTracker, AGENT_OVERVIEW_CLIENT_TAG);

    return {
      trackSubmit: () => {
        if (typeof tracker?.trackAgentSubmit !== 'function') return;
        send(() => tracker.trackAgentSubmit?.({ intent: query }));
      },
      trackLoadStarted: (overview) => {
        if (typeof tracker?.trackAgentResultLoadStarted !== 'function') return;
        send(() =>
          tracker.trackAgentResultLoadStarted?.(overviewParams(query, overview))
        );
      },
      trackLoadFinished: (overview, searchResultCount) => {
        if (typeof tracker?.trackAgentResultLoadFinished !== 'function') {
          return;
        }
        send(() =>
          tracker.trackAgentResultLoadFinished?.({
            ...overviewParams(query, overview),
            searchResultCount,
          })
        );
      },
      trackSectionView: (overview, section) => {
        if (
          !section.searchResultId ||
          typeof tracker?.trackAgentResultView !== 'function'
        ) {
          return;
        }
        const { searchResultId } = section;
        send(() =>
          tracker.trackAgentResultView?.({
            ...overviewParams(query, overview),
            searchResultId,
            numResultsViewed: section.products.length,
            // Behavioral data takes catalog ids only, so products without one are left out.
            items: section.products.flatMap((product) =>
              product.itemId
                ? [
                    {
                      itemId: product.itemId,
                      ...(product.variationId && {
                        variationId: product.variationId,
                      }),
                    },
                  ]
                : []
            ),
          })
        );
      },
      trackProductClick: (overview, product, section) => {
        if (
          !section.searchResultId ||
          !product.itemId ||
          typeof tracker?.trackAgentResultClick !== 'function'
        ) {
          return;
        }
        const { searchResultId } = section;
        const { itemId } = product;
        send(() =>
          tracker.trackAgentResultClick?.({
            ...overviewParams(query, overview),
            searchResultId,
            itemId,
            itemName: product.itemName,
            ...(product.variationId && { variationId: product.variationId }),
          })
        );
      },
    };
  }, [hostTracker, query]);
}
