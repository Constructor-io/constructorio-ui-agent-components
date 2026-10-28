// cspell:ignore Timespans -- the tracker API's viewTimespans field
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import CioAgentRecommendations from '@src/app/recommendations';
import {
  createRecommendationsClient,
  fetchRecommendations,
} from '@src/app/services/agentRecommendationsClient';

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

/** Stands in for the browser's IntersectionObserver, so a test decides when the pod is in view. */
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
const setInView = (isIntersecting: boolean) =>
  act(() => observers.at(-1)?.(isIntersecting));

function resetTracking() {
  Object.values(tracker).forEach((track) => track.mockReset());
  observers.length = 0;
}

const pod = {
  title: 'Everyday Carry',
  products: [
    {
      itemName: 'Card Holder',
      imageUrl: 'https://example.com/a.jpg',
      price: 15,
      url: 'https://example.com/a',
      itemId: '127684',
      variationId: '156837',
    },
  ],
  refinementOptions: ['Slim cardholders', 'Commuter bags'],
  threadId: 'thread-1',
  resultId: 'result-1',
  status: 'complete',
};

const props = {
  apiKey: 'key_test',
  itemId: '119801',
  itemName: 'Card Holder Anchor',
  strategy: 'complementary_pod',
};

describe('CioAgentRecommendations', () => {
  afterEach(() => {
    mockedFetch.mockReset();
    resetTracking();
  });

  it('should show a skeleton, then the title, products and options', async () => {
    mockedFetch.mockResolvedValue(pod);
    render(<CioAgentRecommendations {...props} />);

    expect(screen.getByText('Thinking')).toBeInTheDocument();

    expect(
      await screen.findByRole('heading', { name: 'Everyday Carry' })
    ).toBeInTheDocument();
    expect(screen.getByText('Card Holder')).toBeInTheDocument();
    // The options sit under the products with no visible lead-in text.
    expect(screen.queryByText(/looking for/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Refine recommendations' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Slim cardholders' })
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('should reload for a clicked option and mark it pressed', async () => {
    mockedFetch.mockResolvedValueOnce(pod);
    const onRefinementClick = vi.fn();
    render(
      <CioAgentRecommendations {...props} callbacks={{ onRefinementClick }} />
    );
    await screen.findByRole('heading', { name: 'Everyday Carry' });

    mockedFetch.mockResolvedValueOnce({ ...pod, title: 'Slim Card Carry' });
    fireEvent.click(screen.getByRole('button', { name: 'Slim cardholders' }));

    expect(onRefinementClick).toHaveBeenCalledWith('Slim cardholders');
    expect(
      await screen.findByRole('heading', { name: 'Slim Card Carry' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Slim cardholders' })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(mockedFetch).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        shopperInput: 'Slim cardholders',
        threadId: 'thread-1',
      }),
      expect.any(AbortSignal)
    );
  });

  it('should render nothing when the pod has no products', async () => {
    mockedFetch.mockResolvedValue({ ...pod, products: [] });
    const { container } = render(<CioAgentRecommendations {...props} />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('should render nothing when the request fails', async () => {
    mockedFetch.mockRejectedValue(new Error('status 400'));
    const { container } = render(<CioAgentRecommendations {...props} />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});

describe('CioAgentRecommendations component overrides', () => {
  afterEach(() => {
    mockedFetch.mockReset();
    resetTracking();
  });

  it('should render children in place of the pod, with the pod state', async () => {
    mockedFetch.mockResolvedValue(pod);
    render(
      <CioAgentRecommendations {...props}>
        {({ title, products, isLoading }) =>
          isLoading ? null : (
            <p>
              {title}: {products.length} products
            </p>
          )
        }
      </CioAgentRecommendations>
    );

    expect(
      await screen.findByText('Everyday Carry: 1 products')
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('should prefer children over componentOverrides.reactNode', async () => {
    mockedFetch.mockResolvedValue(pod);
    render(
      <CioAgentRecommendations
        {...props}
        componentOverrides={{ reactNode: <p>From overrides</p> }}
      >
        <p>From children</p>
      </CioAgentRecommendations>
    );

    expect(await screen.findByText('From children')).toBeInTheDocument();
    expect(screen.queryByText('From overrides')).not.toBeInTheDocument();
  });

  it('should still render a root override when the pod has no products', async () => {
    mockedFetch.mockRejectedValue(new Error('status 400'));
    render(
      <CioAgentRecommendations
        {...props}
        componentOverrides={{
          reactNode: ({ error }) => <p>Failed: {String(error)}</p>,
        }}
      />
    );

    expect(await screen.findByText('Failed: status 400')).toBeInTheDocument();
  });

  it('should override the title, product cards and loading state', async () => {
    mockedFetch.mockResolvedValue(pod);
    render(
      <CioAgentRecommendations
        {...props}
        componentOverrides={{
          loading: { reactNode: <p>Finding picks</p> },
          title: { reactNode: ({ title }) => <h3>Custom {title}</h3> },
          productCard: {
            reactNode: ({ product, index }) => (
              <span>
                {index + 1}. {product.itemName}
              </span>
            ),
          },
        }}
      />
    );

    expect(screen.getByText('Finding picks')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Custom Everyday Carry' })
    ).toBeInTheDocument();
    expect(screen.getByText('1. Card Holder')).toBeInTheDocument();
  });

  it('should pass a refine to the refinement override that also reports the click', async () => {
    mockedFetch.mockResolvedValue(pod);
    const onRefinementClick = vi.fn();
    render(
      <CioAgentRecommendations
        {...props}
        callbacks={{ onRefinementClick }}
        componentOverrides={{
          refinement: {
            reactNode: ({ options, refine }) => (
              <ul>
                {options.map((option) => (
                  <li key={option}>
                    <button type="button" onClick={() => refine(option)}>
                      Try {option}
                    </button>
                  </li>
                ))}
              </ul>
            ),
          },
        }}
      />
    );

    fireEvent.click(
      await screen.findByRole('button', { name: 'Try Commuter bags' })
    );

    expect(onRefinementClick).toHaveBeenCalledWith('Commuter bags');
    expect(mockedFetch).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ shopperInput: 'Commuter bags' }),
      expect.any(AbortSignal)
    );
    await screen.findByRole('button', { name: 'Try Commuter bags' });
  });
});

describe('CioAgentRecommendations tracking', () => {
  afterEach(() => {
    mockedFetch.mockReset();
    resetTracking();
  });

  const base = {
    itemId: '119801',
    itemName: 'Card Holder Anchor',
    threadId: 'thread-1',
  };

  it('should send an AnswerView for each settled response', async () => {
    mockedFetch.mockResolvedValueOnce(pod);
    render(<CioAgentRecommendations {...props} />);
    await screen.findByRole('heading', { name: 'Everyday Carry' });

    expect(tracker.trackProductInsightsAgentAnswerView).toHaveBeenCalledWith({
      ...base,
      question: 'complementary_pod',
      answerText: 'Everyday Carry',
      qnaResultId: 'result-1',
      items: [
        { itemId: '127684', itemName: 'Card Holder', variationId: '156837' },
      ],
      followUpQuestions: [
        { value: 'Slim cardholders' },
        { value: 'Commuter bags' },
      ],
    });

    mockedFetch.mockResolvedValueOnce({
      ...pod,
      title: 'Slim Card Carry',
      resultId: 'result-2',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Slim cardholders' }));
    await screen.findByRole('heading', { name: 'Slim Card Carry' });

    expect(tracker.trackProductInsightsAgentQuestionClick).toHaveBeenCalledWith(
      {
        ...base,
        question: 'Slim cardholders',
      }
    );
    expect(tracker.trackProductInsightsAgentAnswerView).toHaveBeenCalledTimes(
      2
    );
    expect(
      tracker.trackProductInsightsAgentAnswerView
    ).toHaveBeenLastCalledWith(
      expect.objectContaining({
        question: 'Slim cardholders',
        answerText: 'Slim Card Carry',
        qnaResultId: 'result-2',
      })
    );
  });

  it('should send a view once the pod is in view with content, then an out-of-view and the dwell', async () => {
    mockedFetch.mockResolvedValue(pod);
    const { unmount } = render(<CioAgentRecommendations {...props} />);

    setInView(true);
    expect(tracker.trackProductInsightsAgentView).not.toHaveBeenCalled();

    await screen.findByRole('heading', { name: 'Everyday Carry' });
    expect(tracker.trackProductInsightsAgentView).toHaveBeenCalledWith({
      ...base,
      questions: [
        { question: 'Slim cardholders' },
        { question: 'Commuter bags' },
      ],
    });

    setInView(false);
    expect(tracker.trackProductInsightsAgentOutOfView).toHaveBeenCalledWith(
      base
    );

    unmount();
    expect(tracker.trackProductInsightsAgentViews).toHaveBeenCalledWith(
      expect.objectContaining({
        ...base,
        viewTimespans: [
          expect.objectContaining({ start: expect.any(String) as string }),
        ],
      })
    );
  });

  it('should send a ResultClick for the default card', async () => {
    mockedFetch.mockResolvedValue(pod);
    const onProductClick = vi.fn((event: React.MouseEvent) =>
      event.preventDefault()
    );
    render(
      <CioAgentRecommendations {...props} callbacks={{ onProductClick }} />
    );

    fireEvent.click(await screen.findByRole('link', { name: /Card Holder/ }));

    expect(tracker.trackProductInsightsAgentResultClick).toHaveBeenCalledWith({
      itemId: '127684',
      itemName: 'Card Holder',
      variationId: '156837',
      question: 'complementary_pod',
      seedItemId: '119801',
      seedItemName: 'Card Holder Anchor',
      qnaResultId: 'result-1',
      threadId: 'thread-1',
      position: 0,
    });
    expect(onProductClick).toHaveBeenCalled();
  });

  it('should hand overrides the click and refinement tracking', async () => {
    mockedFetch.mockResolvedValue(pod);
    render(
      <CioAgentRecommendations
        {...props}
        componentOverrides={{
          productCard: {
            reactNode: ({ product, trackClick }) => (
              <button type="button" onClick={trackClick}>
                Open {product.itemName}
              </button>
            ),
          },
          refinement: {
            reactNode: ({ options, refine }) => (
              <button type="button" onClick={() => refine(options[0])}>
                Refine
              </button>
            ),
          },
        }}
      />
    );

    fireEvent.click(
      await screen.findByRole('button', { name: 'Open Card Holder' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Refine' }));
    // Let the refinement's reload settle inside the test.
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(2));
    await act(async () => {
      await Promise.resolve();
    });

    expect(tracker.trackProductInsightsAgentResultClick).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: '127684', position: 0 })
    );
    expect(tracker.trackProductInsightsAgentQuestionClick).toHaveBeenCalledWith(
      expect.objectContaining({ question: 'Slim cardholders' })
    );
  });

  it('should send AnswerView and views under a root override that renders its own markup', async () => {
    mockedFetch.mockResolvedValue(pod);
    render(
      <CioAgentRecommendations {...props}>
        {({ title, products, trackProductClick }) => (
          <div>
            <h2>{title}</h2>
            {products.map((product, index) => (
              <button
                key={product.url}
                type="button"
                onClick={() => trackProductClick(product, index)}
              >
                {product.itemName}
              </button>
            ))}
          </div>
        )}
      </CioAgentRecommendations>
    );

    setInView(true);
    fireEvent.click(await screen.findByRole('button', { name: 'Card Holder' }));

    expect(tracker.trackProductInsightsAgentAnswerView).toHaveBeenCalledTimes(
      1
    );
    expect(tracker.trackProductInsightsAgentView).toHaveBeenCalled();
    expect(tracker.trackProductInsightsAgentResultClick).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: '127684', position: 0 })
    );
  });

  it('should skip ResultClick on a client older than 2.88', async () => {
    mockedFetch.mockResolvedValue(pod);
    const { trackProductInsightsAgentResultClick } = tracker;
    (tracker as Partial<typeof tracker>).trackProductInsightsAgentResultClick =
      undefined;
    try {
      render(<CioAgentRecommendations {...props} />);
      expect(() => fireEvent.click(screen.getByText('Thinking'))).not.toThrow();
      const link = await screen.findByRole('link', { name: /Card Holder/ });
      expect(() => fireEvent.click(link)).not.toThrow();
    } finally {
      tracker.trackProductInsightsAgentResultClick =
        trackProductInsightsAgentResultClick;
    }
  });
});

describe('CioAgentRecommendations A/B tests', () => {
  afterEach(() => {
    mockedFetch.mockReset();
    resetTracking();
    vi.mocked(createRecommendationsClient).mockClear();
  });

  it('should render a tracking-only placeholder for the control arm, with no request', () => {
    render(
      <CioAgentRecommendations
        {...props}
        abTest={{ isControl: true }}
        componentOverrides={{ reactNode: <p>Override</p> }}
      />
    );

    const placeholder = screen.getByTestId(
      'cio-agent-recommendations-control-placeholder'
    );
    expect(placeholder).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByText('Override')).not.toBeInTheDocument();
    expect(mockedFetch).not.toHaveBeenCalled();

    setInView(true);
    expect(tracker.trackProductInsightsAgentView).toHaveBeenCalledWith({
      itemId: '119801',
      itemName: 'Card Holder Anchor',
      questions: [],
    });
    expect(tracker.trackProductInsightsAgentAnswerView).not.toHaveBeenCalled();
  });

  it('should create its client with the test cells', async () => {
    mockedFetch.mockResolvedValue(pod);
    render(
      <CioAgentRecommendations
        {...props}
        abTest={{ isControl: false, testCells: { constructorio: 'cell_a' } }}
      />
    );
    await screen.findByRole('heading', { name: 'Everyday Carry' });

    expect(createRecommendationsClient).toHaveBeenCalledWith({
      apiKey: 'key_test',
      cioJsClient: undefined,
      testCells: { constructorio: 'cell_a' },
    });
  });

  it('should warn that test cells are ignored next to a supplied client', async () => {
    mockedFetch.mockResolvedValue(pod);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <CioAgentRecommendations
        {...props}
        cioJsClient={{} as never}
        abTest={{ isControl: false, testCells: { constructorio: 'cell_a' } }}
      />
    );
    await screen.findByRole('heading', { name: 'Everyday Carry' });

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('abTest.testCells is ignored')
    );
    warn.mockRestore();
  });
});
