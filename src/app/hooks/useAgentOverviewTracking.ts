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

/**
 * AI Overview's behavioral events, as the AI Overview tracking contract lists them, sent with the
 * JS client's agent tracker methods. Events carry `cio-ui-agent-overview-<version>` as their client
 * tag, even on a host's client. A method the client lacks is skipped, and so is a view or click on
 * a product set without a `searchResultId`, which those events require.
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
        tracker.trackAgentSubmit({ intent: query });
      },
      trackLoadStarted: (overview) => {
        if (typeof tracker?.trackAgentResultLoadStarted !== 'function') return;
        tracker.trackAgentResultLoadStarted(overviewParams(query, overview));
      },
      trackLoadFinished: (overview, searchResultCount) => {
        if (typeof tracker?.trackAgentResultLoadFinished !== 'function') {
          return;
        }
        tracker.trackAgentResultLoadFinished({
          ...overviewParams(query, overview),
          searchResultCount,
        });
      },
      trackSectionView: (overview, section) => {
        if (
          !section.searchResultId ||
          typeof tracker?.trackAgentResultView !== 'function'
        ) {
          return;
        }
        tracker.trackAgentResultView({
          ...overviewParams(query, overview),
          searchResultId: section.searchResultId,
          numResultsViewed: section.products.length,
          items: section.products.map((product) => ({
            itemId: product.itemId ?? product.url,
            ...(product.variationId && { variationId: product.variationId }),
          })),
        });
      },
      trackProductClick: (overview, product, section) => {
        if (
          !section.searchResultId ||
          typeof tracker?.trackAgentResultClick !== 'function'
        ) {
          return;
        }
        tracker.trackAgentResultClick({
          ...overviewParams(query, overview),
          searchResultId: section.searchResultId,
          itemId: product.itemId ?? product.url,
          itemName: product.itemName,
          ...(product.variationId && { variationId: product.variationId }),
        });
      },
    };
  }, [hostTracker, query]);
}
