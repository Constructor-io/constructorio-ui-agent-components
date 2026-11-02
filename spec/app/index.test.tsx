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
const cioJsClient = { options: { apiKey: 'k' } } as never;

function renderOverview(overrides: Partial<IAgentOverviewProps> = {}) {
  const props = {
    ...factories.agentOverviewProps.build({ apiKey: undefined, ...overrides }),
    cioJsClient,
  };
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
    expect(screen.getByText('Generated with AI')).toBeInTheDocument();
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
      c.fail(new AgentInsightsRequestError(422, 'not suitable'));
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

  it('should render nothing for a blank query', () => {
    const { container } = renderOverview({ query: '' });
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
