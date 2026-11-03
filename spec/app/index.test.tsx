import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import {
  controlledStream,
  end,
  itemResults,
  message,
  start,
  streamOf,
} from '@spec/__tests__/controlledStream';
import * as factories from '@spec/factory';

import CioAgentOverview from '@src/app';
import { AgentInsightsRequestError } from '@src/app/services/agentInsightsClient';
import { streamAgentOverview } from '@src/app/services/agentOverviewClient';
import type { IAgentOverviewProps } from '@src/types';

vi.mock('@src/app/services/agentOverviewClient', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  streamAgentOverview: vi.fn(),
}));

const mockedStream = vi.mocked(streamAgentOverview);

function renderOverview(overrides: Partial<IAgentOverviewProps> = {}) {
  const props = factories.agentOverviewProps.build(overrides);
  return render(<CioAgentOverview {...props} />);
}

// The DOM classes are public API (customers style against them), so tests find elements by class.
function find(container: HTMLElement, selector: string): Element | null {
  return container.querySelector(selector);
}

function findAll(container: HTMLElement, selector: string): Element[] {
  return [...container.querySelectorAll(selector)];
}

function root(container: HTMLElement): HTMLElement {
  return find(container, '.cio-agent-overview-root') as HTMLElement;
}

describe('CioAgentOverview', () => {
  afterEach(() => {
    mockedStream.mockReset();
  });

  it('should show the skeleton while loading', () => {
    mockedStream.mockReturnValue(controlledStream().stream);
    const { container } = renderOverview();
    expect(
      find(container, '.cio-agent-overview-skeleton-section')
    ).toBeInTheDocument();
  });

  it('should show the badge and message as soon as the message arrives', async () => {
    const controlled = controlledStream();
    mockedStream.mockReturnValue(controlled.stream);
    const { container } = renderOverview();

    act(() => {
      controlled.push(start);
      controlled.push(message('A casual selection.'));
    });

    expect(await screen.findByText('A casual selection.')).toHaveClass(
      'cio-agent-overview-message'
    );
    expect(screen.getByText('AI Overview')).toHaveClass(
      'cio-agent-overview-badge'
    );
    // Products are still on their way: a carousel placeholder holds their place.
    expect(
      find(
        container,
        '.cio-agent-overview-section .cio-agent-overview-skeleton-products'
      )
    ).toBeInTheDocument();
  });

  it("should render every section's products in one carousel, in order", async () => {
    mockedStream.mockReturnValue(
      streamOf(
        start,
        message('Casual looks.'),
        itemResults('Casual Shirt', 's1', ['Shirt']),
        itemResults('Casual Pants', 's2', ['Pants', 'Chinos']),
        end
      )
    );
    const { container } = renderOverview();

    await waitFor(() =>
      expect(findAll(container, '.cio-agent-overview-carousel')).toHaveLength(1)
    );
    const names = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(names).toEqual(['/p/Shirt', '/p/Pants', '/p/Chinos']);
    expect(
      find(container, '.cio-agent-overview-skeleton-section')
    ).not.toBeInTheDocument();
  });

  it('should show the loading state inside the overview card with its badge', () => {
    mockedStream.mockReturnValue(controlledStream().stream);
    const { container } = renderOverview();
    const card = find(
      container,
      '.cio-agent-overview-section.cio-agent-overview-card'
    );
    expect(card).toContainElement(screen.getByText('AI Overview'));
    expect(
      find(
        container,
        '.cio-agent-overview-section .cio-agent-overview-skeleton-section'
      )
    ).toBeInTheDocument();
  });

  it('should head a single-category overview with its set title', async () => {
    mockedStream.mockReturnValue(
      streamOf(
        start,
        message('Shirts.'),
        itemResults('Summer Shirts', 's1', ['a', 'b']),
        end
      )
    );
    renderOverview();
    expect(
      await screen.findByRole('heading', { name: 'Summer Shirts' })
    ).toHaveClass('cio-agent-overview-section-title');
  });

  it('should not head a multi-category overview', async () => {
    mockedStream.mockReturnValue(
      streamOf(
        start,
        itemResults('Shirt', 's1', ['a']),
        itemResults('Pants', 's2', ['b']),
        end
      )
    );
    renderOverview();
    await screen.findAllByRole('link');
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it("should label the card with the promise's display name", () => {
    mockedStream.mockReturnValue(controlledStream().stream);
    const promise = factories.aiOverviewPromise();
    promise.pod.display_name = 'Search assistant';
    renderOverview({ agenticPromises: [promise] });
    expect(screen.getByText('Search assistant')).toBeInTheDocument();
  });

  it('should take the badge text from translations', () => {
    mockedStream.mockReturnValue(controlledStream().stream);
    renderOverview({
      translations: { 'CioAgentOverview.badge': 'AI summary' },
    });
    expect(screen.getByText('AI summary')).toBeInTheDocument();
  });

  it('should render nothing, without throwing, when agenticPromises is not an array', () => {
    const { container } = renderOverview({
      agenticPromises: 'oops' as never,
    });
    expect(root(container)).toBeEmptyDOMElement();
    expect(mockedStream).not.toHaveBeenCalled();
  });

  it('should render products that share a URL as separate cards', async () => {
    const shared = itemResults('Shirt', 's1', ['Shirt']);
    const again = itemResults('Shirts again', 's2', ['Shirt']);
    mockedStream.mockReturnValue(streamOf(start, shared, again, end));
    renderOverview();
    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(2));
  });

  it('should leave out the badge when its translation is blank', () => {
    mockedStream.mockReturnValue(controlledStream().stream);
    const { container } = renderOverview({
      translations: { 'CioAgentOverview.badge': '' },
    });
    expect(find(container, '.cio-agent-overview-badge')).toBeNull();
  });

  it('should mark the card busy until the overview has finished', async () => {
    const controlled = controlledStream();
    mockedStream.mockReturnValue(controlled.stream);
    const { container } = renderOverview();
    const card = () => find(container, '.cio-agent-overview-card');
    expect(card()).toHaveAttribute('aria-busy', 'true');

    act(() => {
      controlled.push(start);
      controlled.push(itemResults('A', 's1', ['a']));
      controlled.push(end);
    });
    await waitFor(() => expect(card()).toHaveAttribute('aria-busy', 'false'));
  });

  it('should split the message into paragraphs', async () => {
    mockedStream.mockReturnValue(
      streamOf(
        start,
        message('One.'),
        message('Two.'),
        itemResults('A', 's1', ['a']),
        end
      )
    );
    renderOverview();
    expect(await screen.findByText('One.')).toBeInTheDocument();
    expect(screen.getByText('Two.')).toHaveClass('cio-agent-overview-message');
  });

  it('should render nothing for no-overview', async () => {
    const onNoOverview = vi.fn();
    mockedStream.mockReturnValue(streamOf());
    mockedStream.mockImplementation(() => {
      const c = controlledStream();
      c.fail(new AgentInsightsRequestError(204, 'no content'));
      return c.stream;
    });
    const { container } = renderOverview({ callbacks: { onNoOverview } });

    await waitFor(() => expect(onNoOverview).toHaveBeenCalled());
    expect(root(container)).toBeEmptyDOMElement();
  });

  it('should render nothing for an error', async () => {
    const onError = vi.fn();
    mockedStream.mockImplementation(() => {
      const c = controlledStream();
      c.fail(new AgentInsightsRequestError(503, 'down'));
      return c.stream;
    });
    const { container } = renderOverview({ callbacks: { onError } });

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(root(container)).toBeEmptyDOMElement();
  });

  it('should render nothing, and make no request, for a search without a promise', () => {
    const { container } = renderOverview({ agenticPromises: [] });
    expect(root(container)).toBeEmptyDOMElement();
    expect(mockedStream).not.toHaveBeenCalled();
  });

  it("should pass the product's section to onProductClick", async () => {
    const onProductClick = vi.fn((event: React.MouseEvent) =>
      event.preventDefault()
    );
    mockedStream.mockReturnValue(
      streamOf(
        start,
        itemResults('Casual Shirt', 's1', ['Shirt']),
        itemResults('Casual Pants', 's2', ['Pants']),
        end
      )
    );
    const { container } = renderOverview({ callbacks: { onProductClick } });

    await waitFor(() =>
      expect(
        find(container, '.cio-agent-overview-carousel a[href="/p/Pants"]')
      ).toBeInTheDocument()
    );
    fireEvent.click(
      find(container, '.cio-agent-overview-carousel a[href="/p/Pants"]')!
    );

    expect(onProductClick).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ itemName: 'Pants' }),
      expect.objectContaining({ title: 'Casual Pants', searchResultId: 's2' })
    );
  });

  it('should use getProductUrl for card links', async () => {
    mockedStream.mockReturnValue(
      streamOf(start, itemResults('A', 's1', ['Shirt']), end)
    );
    const { container } = renderOverview({
      callbacks: { getProductUrl: (product) => `/custom/${product.itemName}` },
    });
    await waitFor(() =>
      expect(find(container, 'a[href="/custom/Shirt"]')).toBeInTheDocument()
    );
  });

  it('should apply theme variables to the root', () => {
    mockedStream.mockReturnValue(controlledStream().stream);
    const { container } = renderOverview({
      theme: { primaryColor: '#123456' },
    });
    expect(root(container).style.getPropertyValue('--cio-color-primary')).toBe(
      '#123456'
    );
  });
});
