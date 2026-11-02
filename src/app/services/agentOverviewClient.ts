import ConstructorIOClient from '@constructor-io/constructorio-client-javascript';

import type { IAgentOverviewPageContext } from '@src/types';
import version from '@src/version';

import { streamAgentInsights } from './agentInsightsClient';
import type { AgentInsightsEvent } from './agentInsightsTypes';

/** The client tag (`c`) on Agent Overview's requests and tracking events. */
export const AGENT_OVERVIEW_CLIENT_TAG = `cio-ui-agent-overview-${version}`;

interface AgentOverviewClientOptions {
  apiKey?: string;
  cioJsClient?: ConstructorIOClient;
}

/** The host's JS client, or one created for `apiKey` that sends tracking events. */
export function createAgentOverviewClient({
  apiKey,
  cioJsClient,
}: AgentOverviewClientOptions): ConstructorIOClient {
  if (cioJsClient) return cioJsClient;
  if (apiKey) {
    return new ConstructorIOClient({
      apiKey,
      sendTrackingEvents: true,
      version: AGENT_OVERVIEW_CLIENT_TAG,
    });
  }
  throw new Error('Either apiKey or cioJsClient must be provided');
}

/**
 * Streams the AI Overview for a search from `POST /v1/agent_insights/search`. `onResponse` is
 * called when the response arrives, which is when the overview counts as submitted.
 */
export function streamAgentOverview(
  client: ConstructorIOClient,
  request: { query: string; pageContext?: IAgentOverviewPageContext },
  signal?: AbortSignal,
  onResponse?: () => void
): AsyncGenerator<AgentInsightsEvent> {
  const { query, pageContext } = request;
  return streamAgentInsights(
    client,
    'search',
    {
      shopper_input: query,
      page_context: {
        page_type: pageContext?.pageType ?? 'plp',
        search_term: pageContext?.searchTerm ?? query,
      },
    },
    { clientTag: AGENT_OVERVIEW_CLIENT_TAG, signal, onResponse }
  );
}
