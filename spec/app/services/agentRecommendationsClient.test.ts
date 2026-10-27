import ConstructorIOClient from '@constructor-io/constructorio-client-javascript';

import {
  fetchRecommendations,
  RecommendationsRequestError,
} from '@src/app/services/agentRecommendationsClient';

vi.mock('@constructor-io/constructorio-client-javascript', () => ({
  default: vi.fn(),
}));

const MockedClient = vi.mocked(ConstructorIOClient);

const clientWith = (options: Record<string, unknown>) =>
  ({ options }) as unknown as ConstructorIOClient;

function respondWith(body: unknown, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

function sentRequest(fetchMock: ReturnType<typeof respondWith>) {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return { url, init, body: JSON.parse(init.body as string) as unknown };
}

describe('fetchRecommendations', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    MockedClient.mockReset();
  });

  it('should throw if neither apiKey nor cioJsClient is provided', async () => {
    await expect(
      fetchRecommendations({}, { itemId: '1', strategy: 'complementary_pod' })
    ).rejects.toThrow('Either apiKey or cioJsClient must be provided');
  });

  it("should POST the pod request with the client's shopper identity", async () => {
    const fetchMock = respondWith({});

    await fetchRecommendations(
      {
        cioJsClient: clientWith({
          apiKey: 'key_test',
          version: 'cio-js-test',
          clientId: 'client-1',
          sessionId: 3,
          userId: 'user-1',
          segments: ['vip', 'new'],
          testCells: { exp: 'cell_a' },
          agentServiceUrl: 'https://agent.example.com/',
        }),
      },
      {
        itemId: '119801',
        variationId: '156837',
        strategy: 'complementary_pod',
        defaultTitle: 'Pairs well with',
        shopperInput: 'Slim cardholders',
        threadId: 'thread-1',
      }
    );

    const { url, init, body } = sentRequest(fetchMock);
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      'https://agent.example.com/v1/agent_insights/recommendations'
    );
    expect(Object.fromEntries(parsed.searchParams)).toMatchObject({
      key: 'key_test',
      c: 'cio-js-test',
      i: 'client-1',
      s: '3',
      ui: 'user-1',
      'ef-exp': 'cell_a',
      thread_id: 'thread-1',
    });
    expect(parsed.searchParams.getAll('us')).toEqual(['vip', 'new']);
    expect(init).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    expect(body).toEqual({
      shopper_input: 'Slim cardholders',
      parameters: {
        strategy: 'complementary_pod',
        default_title: 'Pairs well with',
      },
      page_context: {
        page_type: 'pdp',
        item_id: '119801',
        variation_id: '156837',
      },
    });
  });

  it('should leave out what a first load does not have', async () => {
    const fetchMock = respondWith({});

    await fetchRecommendations(
      { cioJsClient: clientWith({ apiKey: 'key_test' }) },
      { itemId: '119801', strategy: 'complementary_pod' }
    );

    const { url, body } = sentRequest(fetchMock);
    expect(url).toBe(
      'https://agent.cnstrc.com/v1/agent_insights/recommendations?key=key_test'
    );
    expect(body).toEqual({
      parameters: { strategy: 'complementary_pod' },
      page_context: { page_type: 'pdp', item_id: '119801' },
    });
  });

  it('should create a client tagged with this component when given an apiKey', async () => {
    respondWith({});
    MockedClient.mockImplementation(function (this: unknown) {
      (this as Record<string, unknown>).options = { apiKey: 'key_test' };
      return this as never;
    });

    await fetchRecommendations(
      { apiKey: 'key_test' },
      { itemId: '1', strategy: 'complementary_pod' }
    );

    const [clientOptions] = MockedClient.mock.calls[0];
    expect(clientOptions.apiKey).toBe('key_test');
    expect(clientOptions.version).toMatch(/^cio-ui-agent-recommendations-/);
  });

  it('should map the response to a pod', async () => {
    respondWith({
      result_id: 'result-1',
      thread_id: 'thread-1',
      status: 'complete',
      message: ' Everyday Carry ',
      item_results: [
        {
          response: {
            results: [
              {
                value: 'Card Holder',
                data: {
                  image_url: 'https://example.com/a.jpg',
                  url: 'https://example.com/a',
                  price: 15,
                },
              },
              { value: 'No image', data: { url: 'https://example.com/b' } },
            ],
          },
        },
      ],
      follow_up_refinement: { options: ['Slim cardholders', '', 3] },
    });

    const result = await fetchRecommendations(
      { cioJsClient: clientWith({ apiKey: 'key_test' }) },
      { itemId: '1', strategy: 'complementary_pod' }
    );

    expect(result).toEqual({
      title: 'Everyday Carry',
      products: [
        {
          itemName: 'Card Holder',
          imageUrl: 'https://example.com/a.jpg',
          price: 15,
          url: 'https://example.com/a',
        },
      ],
      refinementOptions: ['Slim cardholders'],
      threadId: 'thread-1',
      resultId: 'result-1',
      status: 'complete',
    });
  });

  it('should reject with the status of a failed response', async () => {
    respondWith({ message: 'Unknown strategy' }, 400);

    const request = fetchRecommendations(
      { cioJsClient: clientWith({ apiKey: 'key_test' }) },
      { itemId: '1', strategy: 'nope' }
    );

    await expect(request).rejects.toBeInstanceOf(RecommendationsRequestError);
    await expect(request).rejects.toMatchObject({ status: 400 });
  });
});
