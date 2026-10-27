import { act, renderHook, waitFor } from '@testing-library/react';

import useAgentRecommendations from '@src/app/hooks/useAgentRecommendations';
import {
  fetchRecommendations,
  type RecommendationsResult,
} from '@src/app/services/agentRecommendationsClient';

vi.mock('@src/app/services/agentRecommendationsClient', () => ({
  fetchRecommendations: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchRecommendations);

const product = (name: string) => ({
  itemName: name,
  imageUrl: `https://example.com/${name}.jpg`,
  price: 10,
  url: `https://example.com/${name}`,
});

const pod = (
  overrides: Partial<RecommendationsResult> = {}
): RecommendationsResult => ({
  title: 'Everyday Carry',
  products: [product('a'), product('b')],
  refinementOptions: ['Slim cardholders', 'Commuter bags'],
  threadId: 'thread-1',
  resultId: 'result-1',
  status: 'complete',
  ...overrides,
});

const baseProps = {
  apiKey: 'key_test',
  itemId: '119801',
  strategy: 'complementary_pod',
};

describe('useAgentRecommendations', () => {
  afterEach(() => {
    mockedFetch.mockReset();
  });

  it('should load the pod for the product on mount', async () => {
    mockedFetch.mockResolvedValue(pod());

    const { result } = renderHook(() => useAgentRecommendations(baseProps));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.title).toBe('Everyday Carry');
    expect(result.current.products).toHaveLength(2);
    expect(result.current.refinementOptions).toEqual([
      'Slim cardholders',
      'Commuter bags',
    ]);
    expect(result.current.activeRefinement).toBeNull();
    expect(mockedFetch).toHaveBeenCalledWith(
      { apiKey: 'key_test', cioJsClient: undefined },
      expect.objectContaining({
        itemId: '119801',
        strategy: 'complementary_pod',
        shopperInput: undefined,
        threadId: undefined,
      }),
      expect.any(AbortSignal)
    );
  });

  it('should refine on the same thread and keep the products on screen while it loads', async () => {
    mockedFetch.mockResolvedValueOnce(pod());
    const { result } = renderHook(() => useAgentRecommendations(baseProps));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let resolveRefinement: (value: RecommendationsResult) => void = () => {};
    mockedFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRefinement = resolve;
      })
    );
    act(() => result.current.refine('Slim cardholders'));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.products).toHaveLength(2);
    expect(mockedFetch).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        shopperInput: 'Slim cardholders',
        threadId: 'thread-1',
      }),
      expect.any(AbortSignal)
    );

    await act(async () => {
      resolveRefinement(
        pod({ title: 'Slim Card Carry', products: [product('c')] })
      );
      await Promise.resolve();
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.title).toBe('Slim Card Carry');
    expect(result.current.activeRefinement).toBe('Slim cardholders');
  });

  it('should fall back to a generic title for a degraded response', async () => {
    mockedFetch.mockResolvedValue(pod({ status: 'partial' }));

    const { result } = renderHook(() => useAgentRecommendations(baseProps));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.title).toBe('You may also like');
    expect(result.current.products).toHaveLength(2);
  });

  it('should prefer defaultTitle over the generic fallback', async () => {
    mockedFetch.mockResolvedValue(pod({ title: '' }));

    const { result } = renderHook(() =>
      useAgentRecommendations({ ...baseProps, defaultTitle: 'Pairs well with' })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.title).toBe('Pairs well with');
  });

  it('should report a failed first load with no products', async () => {
    mockedFetch.mockRejectedValue(new Error('status 400'));

    const { result } = renderHook(() => useAgentRecommendations(baseProps));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('status 400');
    expect(result.current.products).toEqual([]);
  });

  it('should keep the products when a refinement fails', async () => {
    mockedFetch.mockResolvedValueOnce(pod());
    const { result } = renderHook(() => useAgentRecommendations(baseProps));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockedFetch.mockRejectedValueOnce(new Error('status 500'));
    await act(async () => {
      result.current.refine('Slim cardholders');
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('status 500');
    expect(result.current.products).toHaveLength(2);
  });

  it('should start a new pod without the old thread when the product changes', async () => {
    mockedFetch.mockResolvedValue(pod());
    const { result, rerender } = renderHook(
      (props) => useAgentRecommendations(props),
      { initialProps: baseProps }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ ...baseProps, itemId: '200000' });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.products).toEqual([]);
    expect(mockedFetch).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ itemId: '200000', threadId: undefined }),
      expect.any(AbortSignal)
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('should drop the response of a request it superseded', async () => {
    let resolveFirst: (value: RecommendationsResult) => void = () => {};
    mockedFetch.mockImplementationOnce(
      (_options, _request, signal) =>
        new Promise((resolve) => {
          resolveFirst = resolve;
          expect(signal).toBeDefined();
        })
    );
    mockedFetch.mockResolvedValueOnce(pod({ title: 'Second product' }));

    const { result, rerender } = renderHook(
      (props) => useAgentRecommendations(props),
      { initialProps: baseProps }
    );
    rerender({ ...baseProps, itemId: '200000' });
    await waitFor(() => expect(result.current.title).toBe('Second product'));

    await act(async () => {
      resolveFirst(pod({ title: 'First product' }));
      await Promise.resolve();
    });
    expect(result.current.title).toBe('Second product');
  });
});
