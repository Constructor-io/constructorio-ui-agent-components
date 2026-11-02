import type ConstructorIOClient from '@constructor-io/constructorio-client-javascript';

import type {
  AgentInsightsEvent,
  AgentInsightsMode,
} from './agentInsightsTypes';
import type { AgentStreamResultItem } from './agentStreamTypes';
import { parseSse } from './sseParser';

export const DEFAULT_AGENT_SERVICE_URL = 'https://agent.cnstrc.com';

/** The shopper identity a request carries, read from the JS client's options. */
export interface AgentClientIdentity {
  apiKey: string;
  version?: string;
  clientId?: string;
  sessionId?: number;
  userId?: string;
  segments?: string[];
  testCells?: Record<string, string>;
  agentServiceUrl?: string;
}

/** A non-2xx response from an agent_insights endpoint, before any event was streamed. */
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

/**
 * The JS client has no agent_insights method yet, so requests are built from its options. They are
 * private in its type declarations, hence the narrow structural cast.
 */
export function getClientIdentity(
  client: ConstructorIOClient
): AgentClientIdentity {
  return (client as unknown as { options: AgentClientIdentity }).options;
}

/**
 * The endpoint URL with the shopper identity as query parameters. `clientTag` replaces the
 * client's own `c`, so a request is attributed to the component that made it.
 */
export function buildAgentInsightsUrl(
  identity: AgentClientIdentity,
  mode: AgentInsightsMode,
  options: { clientTag?: string; threadId?: string } = {}
): string {
  const params = new URLSearchParams({ key: identity.apiKey });
  const clientTag = options.clientTag || identity.version;
  if (clientTag) params.set('c', clientTag);
  if (identity.clientId) params.set('i', identity.clientId);
  if (identity.sessionId) params.set('s', String(identity.sessionId));
  if (identity.userId) params.set('ui', identity.userId);
  identity.segments?.forEach((segment) => params.append('us', segment));
  Object.entries(identity.testCells ?? {}).forEach(([name, cell]) =>
    params.set(`ef-${name}`, cell)
  );
  if (options.threadId) params.set('thread_id', options.threadId);

  const serviceUrl = (
    identity.agentServiceUrl || DEFAULT_AGENT_SERVICE_URL
  ).replace(/\/$/, '');
  return `${serviceUrl}/v1/agent_insights/${mode}?${params}`;
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
 * Calls `POST /v1/agent_insights/{mode}` and yields its stream as typed events, ending after `end`.
 *
 * @throws AgentInsightsRequestError when the endpoint answers with an error status before
 *   streaming (for `search`, 422 means the query gets no overview). Aborting `signal` rejects with
 *   the `fetch` AbortError.
 */
export async function* streamAgentInsights(
  client: ConstructorIOClient,
  mode: AgentInsightsMode,
  body: object,
  options: { clientTag?: string; threadId?: string; signal?: AbortSignal } = {}
): AsyncGenerator<AgentInsightsEvent> {
  const url = buildAgentInsightsUrl(getClientIdentity(client), mode, options);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!response.ok) throw await toRequestError(response);
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
