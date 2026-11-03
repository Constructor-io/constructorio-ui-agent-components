import type {
  AgentInsightsEvent,
  AgentInsightsPromise,
} from './agentInsightsTypes';
import type { AgentStreamResultItem } from './agentStreamTypes';
import { parseSse } from './sseParser';

/**
 * A response other than 200 from an agent_insights callback, before any event was streamed. 204
 * means the agent produced nothing for the query.
 */
export class AgentInsightsRequestError extends Error {
  readonly status: number;

  readonly code?: string;

  readonly traceId?: string;

  constructor(
    status: number,
    message: string,
    options: { code?: string; traceId?: string } = {}
  ) {
    super(message);
    this.name = 'AgentInsightsRequestError';
    this.status = status;
    this.code = options.code;
    this.traceId = options.traceId;
  }
}

type RawEvent = Record<string, unknown>;

function isObject(value: unknown): value is RawEvent {
  return typeof value === 'object' && value !== null;
}

function toEvent(name: string, raw: RawEvent): AgentInsightsEvent | null {
  const resultId = typeof raw.result_id === 'string' ? raw.result_id : '';
  const base = {
    resultId,
    ...(typeof raw.thread_id === 'string' && { threadId: raw.thread_id }),
  };

  switch (name) {
    case 'start':
    case 'end':
      return { type: name, ...base };
    case 'message':
      return typeof raw.text === 'string'
        ? { type: 'message', ...base, text: raw.text }
        : null;
    case 'item_results': {
      const response = isObject(raw.response) ? raw.response : {};
      if (!Array.isArray(response.results)) return null;
      return {
        type: 'item_results',
        ...base,
        title: typeof raw.title === 'string' ? raw.title : '',
        ...(typeof response.result_id === 'string' && {
          searchResultId: response.result_id,
        }),
        results: response.results as AgentStreamResultItem[],
      };
    }
    case 'server_error':
      return {
        type: 'server_error',
        ...base,
        statusCode: typeof raw.status_code === 'number' ? raw.status_code : 500,
        message: typeof raw.message === 'string' ? raw.message : '',
      };
    default:
      return null;
  }
}

async function toRequestError(
  response: Response
): Promise<AgentInsightsRequestError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Not JSON: keep the status alone.
  }
  const message =
    isObject(body) && typeof body.message === 'string'
      ? body.message
      : `Agent insights request failed with status ${response.status}`;
  const firstError =
    isObject(body) && Array.isArray(body.errors) && isObject(body.errors[0])
      ? body.errors[0]
      : {};
  return new AgentInsightsRequestError(response.status, message, {
    code: typeof firstError.code === 'string' ? firstError.code : undefined,
    traceId:
      isObject(body) && typeof body.trace_id === 'string'
        ? body.trace_id
        : undefined,
  });
}

/**
 * Sends a promise from a Constructor search response, as search wrote it: its `body`, unchanged,
 * to its `callback_url`, which already carries the key and the shopper's identity. Yields the
 * stream as typed events, ending after `end`.
 *
 * @throws AgentInsightsRequestError for any status but 200, which is the only one with an
 *   overview (204: the agent produced nothing). Aborting `signal` rejects with the `fetch`
 *   AbortError.
 */
export async function* streamAgentInsights(
  promise: AgentInsightsPromise,
  options: { signal?: AbortSignal } = {}
): AsyncGenerator<AgentInsightsEvent> {
  const response = await fetch(promise.callback_url, {
    method: promise.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(promise.body),
    signal: options.signal,
  });

  if (response.status !== 200) throw await toRequestError(response);
  if (!response.body) {
    throw new AgentInsightsRequestError(500, 'The response has no body');
  }

  for await (const frame of parseSse(response.body)) {
    let raw: unknown;
    try {
      raw = JSON.parse(frame.data);
    } catch {
      continue;
    }
    const event = isObject(raw) ? toEvent(frame.event, raw) : null;
    if (event) {
      yield event;
      if (event.type === 'end') return;
    }
  }
}
