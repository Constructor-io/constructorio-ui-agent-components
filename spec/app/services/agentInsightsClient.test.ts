// cspell:ignore unstub -- vitest's vi.unstubAllGlobals
import type ConstructorIOClient from '@constructor-io/constructorio-client-javascript';

import {
  AgentInsightsRequestError,
  buildAgentInsightsUrl,
  getClientIdentity,
  streamAgentInsights,
} from '@src/app/services/agentInsightsClient';
import type { AgentInsightsEvent } from '@src/app/services/agentInsightsTypes';

const encoder = new TextEncoder();
const RESULT = { value: 'Oxford Shirt', data: { id: 'S1' } };

function sse(frames: Array<[string, unknown]>): string {
  return frames
    .map(
      ([event, data]) =>
        `event: ${event}\r\ndata: ${typeof data === 'string' ? data : JSON.stringify(data)}\r\n\r\n`
    )
    .join('');
}

function bodyOf(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

function clientWith(options: Record<string, unknown>): ConstructorIOClient {
  return {
    options: { apiKey: 'k', ...options },
  } as unknown as ConstructorIOClient;
}

async function collect(
  events: AsyncGenerator<AgentInsightsEvent>
): Promise<AgentInsightsEvent[]> {
  const out: AgentInsightsEvent[] = [];
  for await (const event of events) out.push(event);
  return out;
}

describe('agentInsightsClient', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('buildAgentInsightsUrl', () => {
    it('should build the URL from the client identity', () => {
      const identity = getClientIdentity(
        clientWith({
          version: 'v',
          clientId: 'c1',
          sessionId: 3,
          userId: 'u',
          segments: ['a', 'b'],
          testCells: { t: 'x' },
        })
      );
      expect(buildAgentInsightsUrl(identity, 'search')).toBe(
        'https://agent.cnstrc.com/v1/agent_insights/search?key=k&c=v&i=c1&s=3&ui=u&us=a&us=b&ef-t=x'
      );
    });

    it("should override the client's own c tag", () => {
      const url = buildAgentInsightsUrl(
        { apiKey: 'k', version: 'host' },
        'search',
        {
          clientTag: 'cio-ui-agent-overview-1.0.0',
        }
      );
      expect(new URL(url).searchParams.getAll('c')).toEqual([
        'cio-ui-agent-overview-1.0.0',
      ]);
    });

    it('should use agentServiceUrl without a trailing slash', () => {
      const url = buildAgentInsightsUrl(
        { apiKey: 'k', agentServiceUrl: 'https://agent.example.com/' },
        'search'
      );
      expect(url).toBe(
        'https://agent.example.com/v1/agent_insights/search?key=k'
      );
    });

    it('should add thread_id when given', () => {
      const url = buildAgentInsightsUrl({ apiKey: 'k' }, 'search', {
        threadId: 't1',
      });
      expect(new URL(url).searchParams.get('thread_id')).toBe('t1');
    });
  });

  describe('streamAgentInsights', () => {
    it('should POST the body as JSON and ask for an event stream', async () => {
      fetchMock.mockResolvedValue(
        new Response(bodyOf(sse([['end', { result_id: 'r1' }]])))
      );
      const controller = new AbortController();

      await collect(
        streamAgentInsights(
          clientWith({}),
          'search',
          { shopper_input: 'q' },
          {
            signal: controller.signal,
          }
        )
      );

      const [url, init = {}] = fetchMock.mock.calls[0];
      expect(url).toBe(
        'https://agent.cnstrc.com/v1/agent_insights/search?key=k'
      );
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual({
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      });
      expect(JSON.parse(init.body as string)).toEqual({ shopper_input: 'q' });
      expect(init.signal).toBe(controller.signal);
    });

    it('should yield typed events for start, message, item_results, server_error and end', async () => {
      const base = { result_id: 'r1', thread_id: 't1' };
      fetchMock.mockResolvedValue(
        new Response(
          bodyOf(
            sse([
              ['start', { ...base, request: { mode: 'search' } }],
              ['message', { ...base, text: 'Here are shirts.' }],
              [
                'item_results',
                {
                  ...base,
                  title: 'Casual Shirt',
                  response: { result_id: 's1', results: [RESULT] },
                },
              ],
              ['server_error', { ...base, status_code: 500, message: 'x' }],
              ['end', base],
            ])
          )
        )
      );

      expect(
        await collect(streamAgentInsights(clientWith({}), 'search', {}))
      ).toEqual([
        { type: 'start', resultId: 'r1', threadId: 't1' },
        {
          type: 'message',
          resultId: 'r1',
          threadId: 't1',
          text: 'Here are shirts.',
        },
        {
          type: 'item_results',
          resultId: 'r1',
          threadId: 't1',
          title: 'Casual Shirt',
          searchResultId: 's1',
          results: [RESULT],
        },
        {
          type: 'server_error',
          resultId: 'r1',
          threadId: 't1',
          statusCode: 500,
          message: 'x',
        },
        { type: 'end', resultId: 'r1', threadId: 't1' },
      ]);
    });

    it('should skip unknown events, invalid JSON and item_results without a results array', async () => {
      fetchMock.mockResolvedValue(
        new Response(
          bodyOf(
            sse([
              ['follow_up_refinement', { result_id: 'r1', options: [] }],
              ['message', '{not json'],
              ['item_results', { result_id: 'r1', title: 'x', response: {} }],
              ['end', { result_id: 'r1' }],
            ])
          )
        )
      );

      expect(
        await collect(streamAgentInsights(clientWith({}), 'search', {}))
      ).toEqual([{ type: 'end', resultId: 'r1' }]);
    });

    it('should stop after end', async () => {
      fetchMock.mockResolvedValue(
        new Response(
          bodyOf(
            sse([
              ['end', { result_id: 'r1' }],
              ['message', { result_id: 'r1', text: 'late' }],
            ])
          )
        )
      );

      expect(
        await collect(streamAgentInsights(clientWith({}), 'search', {}))
      ).toEqual([{ type: 'end', resultId: 'r1' }]);
    });

    it('should throw AgentInsightsRequestError with status, code and trace id', async () => {
      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({
            message: 'not suitable',
            errors: [{ code: 'client_error', message: 'run search' }],
            trace_id: 'tr',
          }),
          { status: 422 }
        )
      );

      const error = await collect(
        streamAgentInsights(clientWith({}), 'search', {})
      ).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AgentInsightsRequestError);
      expect(error).toMatchObject({
        status: 422,
        code: 'client_error',
        message: 'not suitable',
        traceId: 'tr',
      });
    });

    it('should throw with the status alone when the error body is not JSON', async () => {
      fetchMock.mockResolvedValue(
        new Response('Service Unavailable', { status: 503 })
      );

      const error = await collect(
        streamAgentInsights(clientWith({}), 'search', {})
      ).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AgentInsightsRequestError);
      expect(error).toMatchObject({ status: 503, code: undefined });
    });

    it('should throw a 500-status error when a 200 has no body', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

      const error = await collect(
        streamAgentInsights(clientWith({}), 'search', {})
      ).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AgentInsightsRequestError);
      expect(error).toMatchObject({ status: 500 });
    });
  });
});
