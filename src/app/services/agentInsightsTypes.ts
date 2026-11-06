import type { AgentStreamResultItem } from './agentStreamTypes';

/**
 * One entry of a Constructor search response's `agentic_promises`, as search sent it: a request
 * to an agent_insights endpoint that search wrote for the query, filters and shopper it served.
 * Send it as it is; don't build or change it.
 */
export interface AgentInsightsPromise {
  /** The slot the promise fills, e.g. `search_ai_overview`, and its label. */
  pod: { id: string; display_name?: string };
  /** The agent_insights mode, e.g. `search`. */
  mode?: string;
  /** Always `POST`. */
  method?: string;
  /** Ready to call: carries `key`, the shopper identity sent to search, and `parent_result_id`. */
  callback_url: string;
  /** The request body, sent as JSON without changes. */
  body: unknown;
}

interface AgentInsightsEventBase {
  /** The response's id, the same on every event of one response. */
  resultId: string;
  /** The conversation thread, when the response opened or continued one. */
  threadId?: string;
}

/**
 * The stream events a component acts on, with camel-cased fields. Events the library doesn't use
 * (`article_reference`, `follow_up_refinement`, `clarification_quiz`, …) are dropped.
 */
export type AgentInsightsEvent =
  | (AgentInsightsEventBase & { type: 'start' })
  | (AgentInsightsEventBase & { type: 'message'; text: string })
  | (AgentInsightsEventBase & {
      type: 'item_results';
      title: string;
      /** The id of the search or browse response that produced these results. */
      searchResultId?: string;
      results: AgentStreamResultItem[];
    })
  | (AgentInsightsEventBase & {
      type: 'server_error';
      statusCode: number;
      message: string;
    })
  | (AgentInsightsEventBase & { type: 'end' });
