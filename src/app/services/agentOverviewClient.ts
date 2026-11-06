import type { IAgenticPromise } from '@src/types';

import { streamAgentInsights } from './agentInsightsClient';
import type { AgentInsightsEvent } from './agentInsightsTypes';

/** The pod id of the AI Overview's promise in a search response. */
export const AI_OVERVIEW_POD_ID = 'search_ai_overview';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * The AI Overview's promise in a search response's `agentic_promises`, found by its pod id rather
 * than its position, or null when search didn't send one.
 */
export function findAiOverviewPromise(
  promises: unknown
): IAgenticPromise | null {
  if (!Array.isArray(promises)) return null;
  const found: unknown = promises.find(
    (promise: unknown) =>
      isObject(promise) &&
      isObject(promise.pod) &&
      promise.pod.id === AI_OVERVIEW_POD_ID &&
      typeof promise.callback_url === 'string'
  );
  return (found as IAgenticPromise | undefined) ?? null;
}

/** Streams the AI Overview that search promised, sending the promise as it is. */
export function streamAgentOverview(
  promise: IAgenticPromise,
  signal?: AbortSignal
): AsyncGenerator<AgentInsightsEvent> {
  return streamAgentInsights(promise, { signal });
}
