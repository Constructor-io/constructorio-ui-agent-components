import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import * as factories from '@spec/factory';

import CioAgentOverview from '@src/app';
import type { IRecommendationSection } from '@src/types';

function createFakeCategoryStream(): ReadableStream<unknown> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue({
        type: 'message',
        data: { text: 'Here are some categories for you.' },
      });
      controller.enqueue({
        type: 'search_result',
        data: {
          title: 'Running Shoes',
          response: {
            results: [
              {
                value: 'Running Shoes',
                data: {
                  image_url: 'https://example.com/run.jpg',
                  url: '',
                  price: 0,
                },
              },
            ],
          },
        },
      });
      controller.close();
    },
  });
}

/** Emits one section, then fails: the partial-result error path. */
function createFailingProductStream(): ReadableStream<unknown> {
  const chunks: unknown[] = [
    {
      type: 'group',
      data: { title: 'Top Picks', description: 'Best products' },
    },
    {
      type: 'search_result',
      data: {
        title: '',
        response: {
          results: [
            {
              value: 'Shoe A',
              data: {
                image_url: 'https://example.com/a.jpg',
                url: '/a',
                price: 100,
              },
            },
          ],
        },
      },
    },
    // A section is flushed when the next group starts; the stream fails after that.
    {
      type: 'group',
      data: { title: 'Second Group', description: 'Never completes' },
    },
  ];
  // Erroring a stream discards queued chunks, so hand them out one per read.
  return new ReadableStream({
    pull(controller) {
      const chunk = chunks.shift();
      if (chunk === undefined) {
        controller.error(new Error('Stream broke'));
        return;
      }
      controller.enqueue(chunk);
    },
  });
}

function createFakeProductStream(): ReadableStream<unknown> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue({
        type: 'group',
        data: { title: 'Top Picks', description: 'Best products' },
      });
      controller.enqueue({
        type: 'search_result',
        data: {
          title: '',
          response: {
            results: [
              {
                value: 'Shoe A',
                data: {
                  image_url: 'https://example.com/a.jpg',
                  url: '/a',
                  price: 100,
                },
              },
            ],
          },
        },
      });
      controller.close();
    },
  });
}

vi.mock('@src/app/services/agentOverviewClient', () => ({
  createAgentStream: vi.fn(
    (_options: unknown, _intent: string, domain: string) => {
      if (domain === 'searchbar_agent') {
        return createFakeCategoryStream();
      }
      return createFakeProductStream();
    }
  ),
}));

/** Helper: wait for categories, click first one, wait for products */
async function transitionToProducts() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1100);
  });

  const categoryButton = screen.getByRole('button', {
    name: /Running Shoes/i,
  });
  act(() => {
    categoryButton.click();
  });

  await act(async () => {
    await vi.advanceTimersByTimeAsync(200);
  });
}

/** Helper: get the root element's inline style for CSS custom property testing */
function getRootElement(container: HTMLElement): HTMLElement {
  return container.querySelector('.cio-agent-overview-root') as HTMLElement;
}

describe(`${CioAgentOverview.name}: client`, () => {
  it('renders without crashing', async () => {
    const props = factories.agentOverviewProps.build();
    expect(() => render(<CioAgentOverview {...props} />)).not.toThrow();
    await waitFor(() => {
      // Wait for async state updates to settle
    });
  });

  describe('getViewMoreUrl', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('renders view more link using getViewMoreUrl callback', async () => {
      const getViewMoreUrl = vi.fn(
        (section: IRecommendationSection) =>
          `/search?q=${encodeURIComponent(section.title)}`
      );
      const props = factories.agentOverviewProps.build({
        callbacks: { getViewMoreUrl },
      });

      render(<CioAgentOverview {...props} />);
      await transitionToProducts();

      const link = screen.getByRole('link', { name: /view more/i });
      expect(link.getAttribute('href')).toBe('/search?q=Top%20Picks');
      expect(getViewMoreUrl).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Top Picks' })
      );
    });

    it('does not render view more link when getViewMoreUrl is not provided', async () => {
      const props = factories.agentOverviewProps.build();

      render(<CioAgentOverview {...props} />);
      await transitionToProducts();

      expect(screen.getByText('Top Picks')).toBeTruthy();
      expect(screen.queryByRole('link', { name: /view more/i })).toBeNull();
    });
  });

  describe('theme and sanitizeCssValue', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('applies theme overrides as CSS custom properties', async () => {
      const props = factories.agentOverviewProps.build({
        theme: {
          primaryColor: '#ff0000',
          fontFamily: 'Arial, sans-serif',
          spacingMd: '16px',
        },
      });

      const { container } = render(<CioAgentOverview {...props} />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100);
      });

      const root = getRootElement(container);
      expect(root.style.getPropertyValue('--cio-color-primary')).toBe(
        '#ff0000'
      );
      expect(root.style.getPropertyValue('--cio-font-family')).toBe(
        'Arial, sans-serif'
      );
      expect(root.style.getPropertyValue('--cio-spacing-md')).toBe('16px');
    });

    it('sanitizes CSS values by stripping angle brackets', async () => {
      const props = factories.agentOverviewProps.build({
        theme: {
          primaryColor: '<script>alert(1)</script>red',
        },
      });

      const { container } = render(<CioAgentOverview {...props} />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100);
      });

      const root = getRootElement(container);
      const value = root.style.getPropertyValue('--cio-color-primary');
      expect(value).not.toContain('<');
      expect(value).not.toContain('>');
    });

    it('sanitizes CSS values by blocking javascript: protocol', async () => {
      const props = factories.agentOverviewProps.build({
        theme: {
          background: 'javascript:alert(1)',
        },
      });

      const { container } = render(<CioAgentOverview {...props} />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100);
      });

      const root = getRootElement(container);
      const value = root.style.getPropertyValue('--cio-color-background');
      expect(value).not.toContain('javascript:');
      expect(value).toContain('blocked:');
    });

    it.each(['data:text/html,x', 'vbscript:alert(1)', 'DATA:image/svg+xml,x'])(
      'blocks the %s protocol',
      async (background) => {
        const props = factories.agentOverviewProps.build({
          theme: { background },
        });

        const { container } = render(<CioAgentOverview {...props} />);
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1100);
        });

        const value = getRootElement(container).style.getPropertyValue(
          '--cio-color-background'
        );
        expect(value).toMatch(/^blocked:/);
      }
    );

    it('trims whitespace from CSS values', async () => {
      const props = factories.agentOverviewProps.build({
        theme: {
          primaryColor: '  #00ff00  ',
        },
      });

      const { container } = render(<CioAgentOverview {...props} />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100);
      });

      const root = getRootElement(container);
      expect(root.style.getPropertyValue('--cio-color-primary')).toBe(
        '#00ff00'
      );
    });

    it('returns empty styles when no theme is provided', async () => {
      const props = factories.agentOverviewProps.build();

      const { container } = render(<CioAgentOverview {...props} />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100);
      });

      const root = getRootElement(container);
      expect(root.style.getPropertyValue('--cio-color-primary')).toBe('');
    });
  });

  describe('callback wiring', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('fires onCategoryClick with the clicked category', async () => {
      const onCategoryClick = vi.fn();
      const props = factories.agentOverviewProps.build({
        callbacks: { onCategoryClick },
      });

      render(<CioAgentOverview {...props} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100);
      });

      const categoryButton = screen.getByRole('button', {
        name: /Running Shoes/i,
      });
      act(() => {
        categoryButton.click();
      });

      expect(onCategoryClick).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Running Shoes',
          imageUrl: 'https://example.com/run.jpg',
        })
      );
    });

    it('fires onProductClick with event, product, and section', async () => {
      const onProductClick = vi.fn();
      const props = factories.agentOverviewProps.build({
        callbacks: { onProductClick },
      });

      render(<CioAgentOverview {...props} />);
      await transitionToProducts();

      // Find a product card and click it
      const productElement = screen.getByText('Shoe A');
      fireEvent.click(productElement);

      expect(onProductClick).toHaveBeenCalledWith(
        expect.any(Object), // MouseEvent
        expect.objectContaining({ itemName: 'Shoe A' }),
        expect.objectContaining({ title: 'Top Picks' })
      );
    });
  });

  describe('translations', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('renders custom translation for AI badge', async () => {
      const props = factories.agentOverviewProps.build({
        translations: {
          'CioAgentOverview.section.aiBadge': 'Custom AI Label',
        },
      });

      render(<CioAgentOverview {...props} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100);
      });

      expect(screen.getByText('Custom AI Label')).toBeTruthy();
    });
  });

  describe('error state', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('renders the error when the product stream fails after categories', async () => {
      const { createAgentStream: mockCreate } =
        await import('@src/app/services/agentOverviewClient');
      vi.mocked(mockCreate).mockImplementation(
        (_options: unknown, _intent: string, domain: string) => {
          if (domain === 'searchbar_agent') {
            return createFakeCategoryStream();
          }
          throw new Error('Products failed');
        }
      );

      const props = factories.agentOverviewProps.build();
      render(<CioAgentOverview {...props} />);
      await transitionToProducts();

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Something went wrong. Please try again.'
      );

      vi.mocked(mockCreate).mockImplementation(
        (_options: unknown, _intent: string, domain: string) => {
          if (domain === 'searchbar_agent') {
            return createFakeCategoryStream();
          }
          return createFakeProductStream();
        }
      );
    });

    it('shows the error next to sections that arrived before the stream failed', async () => {
      const { createAgentStream: mockCreate } =
        await import('@src/app/services/agentOverviewClient');
      vi.mocked(mockCreate).mockImplementation(
        (_options: unknown, _intent: string, domain: string) => {
          if (domain === 'searchbar_agent') {
            return createFakeCategoryStream();
          }
          return createFailingProductStream();
        }
      );

      const props = factories.agentOverviewProps.build();
      render(<CioAgentOverview {...props} />);
      await transitionToProducts();

      expect(screen.getByRole('heading', { name: 'Top Picks' })).toBeTruthy();
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Something went wrong. Please try again.'
      );

      vi.mocked(mockCreate).mockImplementation(
        (_options: unknown, _intent: string, domain: string) => {
          if (domain === 'searchbar_agent') {
            return createFakeCategoryStream();
          }
          return createFakeProductStream();
        }
      );
    });

    it('renders a single skeleton while products load', async () => {
      const { createAgentStream: mockCreate } =
        await import('@src/app/services/agentOverviewClient');
      vi.mocked(mockCreate).mockImplementation(
        (_options: unknown, _intent: string, domain: string) => {
          if (domain === 'searchbar_agent') {
            return createFakeCategoryStream();
          }
          // Never resolves, so the products phase stays in its loading state.
          return new ReadableStream({ start() {} });
        }
      );

      const props = factories.agentOverviewProps.build();
      const { container } = render(<CioAgentOverview {...props} />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100);
      });
      fireEvent.click(screen.getByRole('button', { name: /Running Shoes/i }));

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const skeletons = container.querySelectorAll(
        '.cio-agent-overview-skeleton-section'
      );
      // The default products skeleton has 3 rows; a second skeleton tree would add a 4th.
      expect(skeletons).toHaveLength(3);

      vi.mocked(mockCreate).mockImplementation(
        (_options: unknown, _intent: string, domain: string) => {
          if (domain === 'searchbar_agent') {
            return createFakeCategoryStream();
          }
          return createFakeProductStream();
        }
      );
    });

    it('renders error message when streams fail', async () => {
      vi.useFakeTimers();
      const { createAgentStream: mockCreate } =
        await import('@src/app/services/agentOverviewClient');
      vi.mocked(mockCreate).mockImplementation(() => {
        throw new Error('Network failure');
      });

      const props = factories.agentOverviewProps.build();
      render(<CioAgentOverview {...props} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100);
      });

      expect(
        screen.getByText('Something went wrong. Please try again.')
      ).toBeTruthy();
      expect(screen.getByRole('alert').textContent).toBe(
        'Something went wrong. Please try again.'
      );

      vi.mocked(mockCreate).mockImplementation(
        (_options: unknown, _intent: string, domain: string) => {
          if (domain === 'searchbar_agent') {
            return createFakeCategoryStream();
          }
          return createFakeProductStream();
        }
      );
      vi.useRealTimers();
    });
  });
});
