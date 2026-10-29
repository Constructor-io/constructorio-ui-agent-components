import ConstructorIOClient from '@constructor-io/constructorio-client-javascript';

import type { IProduct } from '@src/types';
import toProduct from '@src/utils/toProduct';
import version from '@src/version';

import type { AgentStreamResultItem } from './agentStreamTypes';

const DEFAULT_AGENT_SERVICE_URL = 'https://agent.cnstrc.com';

interface AgentClientOptions {
  apiKey?: string;
  cioJsClient?: ConstructorIOClient;
  /** Set on a client created for `apiKey`. A supplied `cioJsClient` keeps its own. */
  testCells?: Record<string, string>;
}

export interface RecommendationsRequest {
  itemId: string;
  variationId?: string;
  strategy: string;
  defaultTitle?: string;
  /** A refinement option the shopper picked. Absent on the first load. */
  shopperInput?: string;
  /** The thread of the previous response, so a refinement keeps its context. */
  threadId?: string;
}

export interface RecommendationsResult {
  title: string;
  products: IProduct[];
  refinementOptions: string[];
  threadId?: string;
  resultId?: string;
  /** `'partial'` means the agent degraded, but any products it returned are still usable. */
  status?: string;
}

/** A non-2xx response from the recommendations endpoint. */
export class RecommendationsRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'RecommendationsRequestError';
    this.status = status;
  }
}

// The JS client has no method for this endpoint yet, so the request is built from the client's own
// options. They are private in its type declarations, hence the narrow structural type.
interface ClientIdentity {
  apiKey: string;
  version?: string;
  clientId?: string;
  sessionId?: number;
  userId?: string;
  segments?: string[];
  testCells?: Record<string, string>;
  agentServiceUrl?: string;
}

/** The pod's JS client: the host's, or one created for `apiKey` and tagged as this component's. */
export function createRecommendationsClient({
  apiKey,
  cioJsClient,
  testCells,
}: AgentClientOptions): ConstructorIOClient {
  if (cioJsClient) return cioJsClient;
  if (apiKey) {
    return new ConstructorIOClient({
      apiKey,
      sendTrackingEvents: true,
      version: `cio-ui-agent-recommendations-${version}`,
      ...(testCells && { testCells }),
    });
  }
  throw new Error('Either apiKey or cioJsClient must be provided');
}

function buildUrl(identity: ClientIdentity, threadId?: string): string {
  const params = new URLSearchParams({ key: identity.apiKey });
  if (identity.version) params.set('c', identity.version);
  if (identity.clientId) params.set('i', identity.clientId);
  if (identity.sessionId) params.set('s', String(identity.sessionId));
  if (identity.userId) params.set('ui', identity.userId);
  identity.segments?.forEach((segment) => params.append('us', segment));
  Object.entries(identity.testCells ?? {}).forEach(([name, cell]) =>
    params.set(`ef-${name}`, cell)
  );
  if (threadId) params.set('thread_id', threadId);

  const serviceUrl = (
    identity.agentServiceUrl || DEFAULT_AGENT_SERVICE_URL
  ).replace(/\/$/, '');
  return `${serviceUrl}/v1/agent_insights/recommendations?${params}`;
}

interface RecommendationsResponse {
  result_id?: string;
  thread_id?: string;
  status?: string;
  message?: string;
  item_results?: Array<{ response?: { results?: AgentStreamResultItem[] } }>;
  follow_up_refinement?: { options?: unknown[] };
}

function toResult(body: RecommendationsResponse): RecommendationsResult {
  const products = (body.item_results ?? [])
    .flatMap((event) => event.response?.results ?? [])
    .map(toProduct)
    .filter((product): product is IProduct => product !== null);
  const refinementOptions = (body.follow_up_refinement?.options ?? []).filter(
    (option): option is string =>
      typeof option === 'string' && option.trim() !== ''
  );

  return {
    title: typeof body.message === 'string' ? body.message.trim() : '',
    products,
    refinementOptions,
    threadId: body.thread_id,
    resultId: body.result_id,
    status: body.status,
  };
}

/**
 * Fetches one recommendations pod from `POST /v1/agent_insights/recommendations`, as a single
 * aggregated JSON document rather than a stream: the pod renders its title, products and options
 * together.
 */
export async function fetchRecommendations(
  options: AgentClientOptions,
  request: RecommendationsRequest,
  signal?: AbortSignal
): Promise<RecommendationsResult> {
  const client = createRecommendationsClient(options);
  const identity = (client as unknown as { options: ClientIdentity }).options;

  const response = await fetch(buildUrl(identity, request.threadId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      shopper_input: request.shopperInput,
      parameters: {
        strategy: request.strategy,
        default_title: request.defaultTitle,
      },
      page_context: {
        page_type: 'pdp',
        item_id: request.itemId,
        variation_id: request.variationId,
      },
    }),
    signal,
  });

  if (!response.ok) {
    throw new RecommendationsRequestError(
      response.status,
      `Recommendations request failed with status ${response.status}`
    );
  }

  return toResult((await response.json()) as RecommendationsResponse);
}
