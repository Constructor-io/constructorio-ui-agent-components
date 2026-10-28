import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';

import useAgentRecommendations from '@src/app/hooks/useAgentRecommendations';
import { fetchRecommendations } from '@src/app/services/agentRecommendationsClient';
import type { IAgentRecommendationsProps } from '@src/types';

const { tracker } = vi.hoisted(() => ({
  tracker: {
    trackProductInsightsAgentView: vi.fn(),
    trackProductInsightsAgentViews: vi.fn(),
    trackProductInsightsAgentOutOfView: vi.fn(),
    trackProductInsightsAgentAnswerView: vi.fn(),
    trackProductInsightsAgentQuestionClick: vi.fn(),
    trackProductInsightsAgentResultClick: vi.fn(),
  },
}));

vi.mock('@src/app/services/agentRecommendationsClient', () => ({
  fetchRecommendations: vi.fn(),
  createRecommendationsClient: vi.fn(() => ({ tracker })),
}));

const mockedFetch = vi.mocked(fetchRecommendations);

const observers: Array<(isIntersecting: boolean) => void> = [];
class FakeIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    observers.push((isIntersecting) =>
      callback(
        [{ isIntersecting } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver
      )
    );
  }

  observe() {}

  disconnect() {}
}
vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);

const product = {
  itemName: 'Card Holder',
  imageUrl: 'https://example.com/a.jpg',
  price: 15,
  url: 'https://example.com/a',
  itemId: '127684',
};

const pod = {
  title: 'Everyday Carry',
  products: [product],
  refinementOptions: ['Slim cardholders'],
  threadId: 'thread-1',
  resultId: 'result-1',
  status: 'complete',
};

const props: IAgentRecommendationsProps = {
  apiKey: 'key_test',
  itemId: '119801',
  itemName: 'Card Holder Anchor',
  strategy: 'complementary_pod',
};

describe('useAgentRecommendations', () => {
  afterEach(() => {
    mockedFetch.mockReset();
    Object.values(tracker).forEach((track) => track.mockReset());
    observers.length = 0;
  });

  it('should load the pod and send an AnswerView for it', async () => {
    mockedFetch.mockResolvedValue(pod);
    const { result } = renderHook(() => useAgentRecommendations(props));

    await waitFor(() => expect(result.current.title).toBe('Everyday Carry'));
    expect(result.current.resultId).toBe('result-1');
    expect(tracker.trackProductInsightsAgentAnswerView).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: '119801',
        itemName: 'Card Holder Anchor',
        question: 'complementary_pod',
        answerText: 'Everyday Carry',
        qnaResultId: 'result-1',
      })
    );
  });

  it('should track a refinement and call onRefinementClick before reloading', async () => {
    mockedFetch.mockResolvedValue(pod);
    const onRefinementClick = vi.fn();
    const { result } = renderHook(() =>
      useAgentRecommendations({ ...props, callbacks: { onRefinementClick } })
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.refine('Slim cardholders');
      await Promise.resolve();
    });

    expect(tracker.trackProductInsightsAgentQuestionClick).toHaveBeenCalledWith(
      expect.objectContaining({ question: 'Slim cardholders' })
    );
    expect(onRefinementClick).toHaveBeenCalledWith('Slim cardholders');
    expect(mockedFetch).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        shopperInput: 'Slim cardholders',
        threadId: 'thread-1',
      }),
      expect.any(AbortSignal)
    );
  });

  it('should send a ResultClick from trackProductClick', async () => {
    mockedFetch.mockResolvedValue(pod);
    const { result } = renderHook(() => useAgentRecommendations(props));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.trackProductClick(product, 2));

    expect(tracker.trackProductInsightsAgentResultClick).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: '127684',
        seedItemId: '119801',
        position: 2,
        qnaResultId: 'result-1',
      })
    );
  });

  it('should send views only once containerRef is attached', async () => {
    mockedFetch.mockResolvedValue(pod);

    function Pod() {
      const { containerRef, title } = useAgentRecommendations(props);
      return <section ref={containerRef}>{title}</section>;
    }
    render(<Pod />);
    await screen.findByText('Everyday Carry');

    act(() => observers.at(-1)?.(true));

    expect(tracker.trackProductInsightsAgentView).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: '119801',
        questions: [{ question: 'Slim cardholders' }],
      })
    );
  });
});
