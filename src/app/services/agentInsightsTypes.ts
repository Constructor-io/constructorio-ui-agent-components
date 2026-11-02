import type { AgentStreamResultItem } from './agentStreamTypes';

/** The `/v1/agent_insights/{mode}` endpoints this library calls. Add a mode when a component uses it. */
export type AgentInsightsMode = 'search';

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
