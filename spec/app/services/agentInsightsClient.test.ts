// cspell:ignore unstub -- vitest's vi.unstubAllGlobals
import {
  AgentInsightsRequestError,
  streamAgentInsights,
} from '@src/app/services/agentInsightsClient';
import type {
  AgentInsightsEvent,
  AgentInsightsPromise,
} from '@src/app/services/agentInsightsTypes';

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

const CALLBACK_URL =
  'https://agent.cnstrc.com/v1/agent_insights/search?key=k&i=c1&s=3&c=host-tag&parent_result_id=p1';

function promiseWith(
  overrides: Partial<AgentInsightsPromise> = {}
): AgentInsightsPromise {
  return {
    pod: { id: 'search_ai_overview', display_name: 'AI Overview' },
    mode: 'search',
    method: 'POST',
    callback_url: CALLBACK_URL,
    body: {
      shopper_input: 'q',
      page_context: { page_type: 'plp', search_term: 'q', filters: { a: 1 } },
    },
    ...overrides,
  };
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

  describe('streamAgentInsights', () => {
    it("should POST the promise's body, unchanged, to its callback_url", async () => {
      fetchMock.mockResolvedValue(
        new Response(bodyOf(sse([['end', { result_id: 'r1' }]])))
      );
      const controller = new AbortController();
      const promise = promiseWith();

      await collect(
        streamAgentInsights(promise, { signal: controller.signal })
      );

      const [url, init = {}] = fetchMock.mock.calls[0];
      expect(url).toBe(CALLBACK_URL);
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual({
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      });
      expect(JSON.parse(init.body as string)).toEqual(promise.body);
      expect(init.signal).toBe(controller.signal);
    });

    it("should use POST when the promise doesn't say", async () => {
      fetchMock.mockResolvedValue(
        new Response(bodyOf(sse([['end', { result_id: 'r1' }]])))
      );
      await collect(streamAgentInsights(promiseWith({ method: undefined })));
      expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
    });

    it('should throw with status 204 when the agent produced nothing', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

      const error = await collect(streamAgentInsights(promiseWith())).catch(
        (e: unknown) => e
      );

      expect(error).toBeInstanceOf(AgentInsightsRequestError);
      expect(error).toMatchObject({ status: 204 });
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

      expect(await collect(streamAgentInsights(promiseWith()))).toEqual([
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

      expect(await collect(streamAgentInsights(promiseWith()))).toEqual([
        { type: 'end', resultId: 'r1' },
      ]);
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

      expect(await collect(streamAgentInsights(promiseWith()))).toEqual([
        { type: 'end', resultId: 'r1' },
      ]);
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

      const error = await collect(streamAgentInsights(promiseWith())).catch(
        (e: unknown) => e
      );

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

      const error = await collect(streamAgentInsights(promiseWith())).catch(
        (e: unknown) => e
      );

      expect(error).toBeInstanceOf(AgentInsightsRequestError);
      expect(error).toMatchObject({ status: 503, code: undefined });
    });

    it('should throw a 500-status error when a 200 has no body', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

      const error = await collect(streamAgentInsights(promiseWith())).catch(
        (e: unknown) => e
      );

      expect(error).toBeInstanceOf(AgentInsightsRequestError);
      expect(error).toMatchObject({ status: 500 });
    });
  });
});
