// cspell:ignore unstub -- vitest's vi.unstubAllGlobals
import { StrictMode } from 'react';

import { act, render, renderHook, waitFor } from '@testing-library/react';

import {
  controlledStream,
  end,
  itemResults,
  message,
  start,
  streamOf,
} from '@spec/__tests__/controlledStream';
import * as factories from '@spec/factory';

import useAgentOverview from '@src/app/hooks/useAgentOverview';
import { AgentInsightsRequestError } from '@src/app/services/agentInsightsClient';
import type { AgentInsightsEvent } from '@src/app/services/agentInsightsTypes';
import {
  AGENT_OVERVIEW_CLIENT_TAG,
  streamAgentOverview,
} from '@src/app/services/agentOverviewClient';
import type { IAgentOverviewProps } from '@src/types';

vi.mock('@src/app/services/agentOverviewClient', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  streamAgentOverview: vi.fn(),
}));

const mockedStream = vi.mocked(streamAgentOverview);
const QUERY = 'I want to buy casual style';

const TRACKER_METHODS = [
  'trackAgentSubmit',
  'trackAgentResultLoadStarted',
  'trackAgentResultLoadFinished',
  'trackAgentResultView',
  'trackAgentResultClick',
] as const;
type Tracker = Record<
  (typeof TRACKER_METHODS)[number],
  ReturnType<typeof vi.fn>
> & {
  options: Record<string, unknown>;
};

let tracker: Tracker;
let cioJsClient: never;

// A fake IntersectionObserver that a test moves elements in and out of view.
let observers: Array<{
  callback: IntersectionObserverCallback;
  targets: Element[];
}> = [];
class FakeIntersectionObserver {
  private entry: (typeof observers)[number];

  constructor(callback: IntersectionObserverCallback) {
    this.entry = { callback, targets: [] };
    observers.push(this.entry);
  }

  observe(target: Element) {
    this.entry.targets.push(target);
  }

  disconnect() {
    observers = observers.filter((o) => o !== this.entry);
  }
}

/** Reports `only` (or every observed element) as in or out of view. */
function setInView(
  isIntersecting: boolean,
  intersectionRatio = isIntersecting ? 1 : 0,
  only?: Element
) {
  observers.forEach(({ callback, targets }) =>
    targets
      .filter((target) => !only || target === only)
      .forEach((target) =>
        callback(
          [
            {
              isIntersecting,
              intersectionRatio,
              target,
            } as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver
        )
      )
  );
}

/** An element like the component's: one product card per product, in order. */
function containerWithCards(count: number) {
  const container = document.createElement('div');
  const cards = Array.from({ length: count }, () => {
    const card = document.createElement('a');
    card.className = 'cio-agent-overview-product-card';
    container.appendChild(card);
    return card;
  });
  return { container, cards };
}

/** A stream that reports its response arrived, as the real client does, unless already aborted. */
function respondWith(stream: AsyncGenerator<AgentInsightsEvent>) {
  mockedStream.mockImplementationOnce(
    (_client, _request, signal, onResponse) => {
      queueMicrotask(() => {
        if (!signal?.aborted) onResponse?.();
      });
      return stream;
    }
  );
}

function build(overrides: Partial<IAgentOverviewProps> = {}) {
  return {
    ...factories.agentOverviewProps.build({ apiKey: undefined, ...overrides }),
    cioJsClient,
  };
}

function renderOverview(overrides: Partial<IAgentOverviewProps> = {}) {
  const view = renderHook((props) => useAgentOverview(props), {
    initialProps: build(overrides),
  });
  act(() => view.result.current.viewRef(document.createElement('div')));
  return view;
}

describe('useAgentOverview tracking', () => {
  beforeEach(() => {
    tracker = {
      options: { apiKey: 'k', version: 'host-tag' },
      ...Object.fromEntries(TRACKER_METHODS.map((name) => [name, vi.fn()])),
    } as unknown as Tracker;
    cioJsClient = { options: tracker.options, tracker } as never;
    observers = [];
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  });

  afterEach(() => {
    mockedStream.mockReset();
    vi.unstubAllGlobals();
  });

  it('should send submit when the response arrives', async () => {
    respondWith(controlledStream().stream);
    renderOverview();
    await waitFor(() =>
      expect(tracker.trackAgentSubmit).toHaveBeenCalledWith({ intent: QUERY })
    );
  });

  it('should send one submit under StrictMode', async () => {
    respondWith(controlledStream().stream);
    respondWith(controlledStream().stream);
    renderHook(() => useAgentOverview(build()), { wrapper: StrictMode });
    await waitFor(() => expect(tracker.trackAgentSubmit).toHaveBeenCalled());
    await act(() => Promise.resolve());
    expect(tracker.trackAgentSubmit).toHaveBeenCalledTimes(1);
  });

  it('should send views from an element mounted with the hook under StrictMode', async () => {
    respondWith(controlledStream().stream);
    const controlled = controlledStream();
    respondWith(controlled.stream);
    let status = '';
    function Headless() {
      const overview = useAgentOverview(build());
      status = overview.status;
      return <div ref={overview.viewRef} />;
    }
    render(
      <StrictMode>
        <Headless />
      </StrictMode>
    );
    act(() => {
      controlled.push(start);
      controlled.push(itemResults('A', 's1', ['a']));
      controlled.push(end);
    });
    await waitFor(() => expect(status).toBe('done'));

    act(() => setInView(true));

    expect(tracker.trackAgentResultView).toHaveBeenCalledTimes(1);
  });

  it('should send load started with the result and thread ids', async () => {
    respondWith(streamOf(start));
    renderOverview();
    await waitFor(() =>
      expect(tracker.trackAgentResultLoadStarted).toHaveBeenCalledWith({
        intent: QUERY,
        intentResultId: 'r1',
        threadId: 't1',
      })
    );
  });

  it('should send load finished with the products shown', async () => {
    respondWith(
      streamOf(
        start,
        message('Hi.'),
        itemResults('A', 's1', ['a', 'b']),
        itemResults('B', 's2', ['c']),
        end
      )
    );
    renderOverview();
    await waitFor(() =>
      expect(tracker.trackAgentResultLoadFinished).toHaveBeenCalledWith({
        intent: QUERY,
        intentResultId: 'r1',
        threadId: 't1',
        searchResultCount: 3,
      })
    );
  });

  it('should send load finished with 0 after a server_error', async () => {
    respondWith(
      streamOf(
        start,
        {
          type: 'server_error',
          resultId: 'r1',
          statusCode: 500,
          message: 'boom',
        },
        end
      )
    );
    renderOverview();
    await waitFor(() =>
      expect(tracker.trackAgentResultLoadFinished).toHaveBeenCalledWith(
        expect.objectContaining({ searchResultCount: 0 })
      )
    );
  });

  it('should send only submit on a 422', async () => {
    const controlled = controlledStream();
    respondWith(controlled.stream);
    const { result } = renderOverview();
    act(() => controlled.fail(new AgentInsightsRequestError(422, 'no')));
    await waitFor(() => expect(result.current.status).toBe('no-overview'));
    expect(tracker.trackAgentSubmit).toHaveBeenCalledTimes(1);
    expect(tracker.trackAgentResultLoadStarted).not.toHaveBeenCalled();
    expect(tracker.trackAgentResultLoadFinished).not.toHaveBeenCalled();
  });

  it('should send one view per section when in view', async () => {
    respondWith(
      streamOf(
        start,
        itemResults('A', 's1', ['a', 'b']),
        itemResults('B', 's2', ['c']),
        end
      )
    );
    const { result } = renderOverview();
    await waitFor(() => expect(result.current.status).toBe('done'));

    act(() => setInView(true));

    expect(tracker.trackAgentResultView).toHaveBeenCalledTimes(2);
    expect(tracker.trackAgentResultView).toHaveBeenCalledWith({
      intent: QUERY,
      intentResultId: 'r1',
      threadId: 't1',
      searchResultId: 's1',
      numResultsViewed: 2,
      items: [{ itemId: 'id-a' }, { itemId: 'id-b' }],
    });
  });

  it('should send a view for a section that arrives while in view', async () => {
    const controlled = controlledStream();
    respondWith(controlled.stream);
    const { result } = renderOverview();
    act(() => setInView(true));

    act(() => {
      controlled.push(start);
      controlled.push(itemResults('A', 's1', ['a']));
    });
    await waitFor(() => expect(result.current.sections).toHaveLength(1));

    expect(tracker.trackAgentResultView).toHaveBeenCalledWith(
      expect.objectContaining({ searchResultId: 's1' })
    );
  });

  it('should not count an overview less than half on screen as viewed', async () => {
    respondWith(streamOf(start, itemResults('A', 's1', ['a']), end));
    const { result } = renderOverview();
    await waitFor(() => expect(result.current.status).toBe('done'));

    act(() => setInView(true, 0.1));
    expect(tracker.trackAgentResultView).not.toHaveBeenCalled();

    act(() => setInView(true, 0.6));
    expect(tracker.trackAgentResultView).toHaveBeenCalledTimes(1);
  });

  it('should not send views for sections that arrive after it scrolls away', async () => {
    const controlled = controlledStream();
    respondWith(controlled.stream);
    const { result } = renderOverview();
    act(() => setInView(true, 0.6));
    // The observer reports the drop below half as a ratio, still intersecting.
    act(() => setInView(true, 0.3));

    act(() => {
      controlled.push(start);
      controlled.push(itemResults('A', 's1', ['a']));
    });
    await waitFor(() => expect(result.current.sections).toHaveLength(1));

    expect(tracker.trackAgentResultView).not.toHaveBeenCalled();
  });

  it('should send load finished with the products shown when the stream breaks off', async () => {
    const controlled = controlledStream();
    respondWith(controlled.stream);
    const { result } = renderOverview();
    act(() => {
      controlled.push(start);
      controlled.push(itemResults('A', 's1', ['a', 'b']));
      controlled.fail(new TypeError('network error'));
    });
    await waitFor(() => expect(result.current.status).toBe('done'));
    expect(tracker.trackAgentResultLoadFinished).toHaveBeenCalledWith(
      expect.objectContaining({ searchResultCount: 2 })
    );
  });

  it("should send a set's view only once one of its cards is on screen", async () => {
    respondWith(
      streamOf(
        start,
        itemResults('Shirt', 's1', ['a']),
        itemResults('Pants', 's2', ['b']),
        itemResults('Shorts', 's3', ['c']),
        end
      )
    );
    const { container, cards } = containerWithCards(3);
    const { result } = renderHook(() => useAgentOverview(build()));
    act(() => result.current.viewRef(container));
    await waitFor(() => expect(result.current.status).toBe('done'));

    act(() => setInView(true, 1, container));
    expect(tracker.trackAgentResultView).not.toHaveBeenCalled();

    act(() => setInView(true, 0.6, cards[1]));
    act(() => setInView(true, 0.3, cards[2]));
    act(() => setInView(true, 1, cards[0]));

    expect(
      tracker.trackAgentResultView.mock.calls.map(
        ([params]) => (params as { searchResultId: string }).searchResultId
      )
    ).toEqual(['s2', 's1']);
  });

  it('should leave out of views, and not send clicks for, products without an id', async () => {
    const set = itemResults('A', 's1', ['a', 'b']);
    if (set.type === 'item_results') delete set.results[1].data!.id;
    respondWith(streamOf(start, set, end));
    const { result } = renderOverview();
    await waitFor(() => expect(result.current.status).toBe('done'));

    act(() => setInView(true));
    expect(tracker.trackAgentResultView).toHaveBeenCalledWith(
      expect.objectContaining({
        numResultsViewed: 2,
        items: [{ itemId: 'id-a' }],
      })
    );

    const [section] = result.current.sections;
    act(() => result.current.trackProductClick(section.products[1], section));
    expect(tracker.trackAgentResultClick).not.toHaveBeenCalled();
  });

  it('should send load finished with 0 when the stream breaks before any products', async () => {
    const controlled = controlledStream();
    respondWith(controlled.stream);
    const { result } = renderOverview();
    act(() => {
      controlled.push(start);
      controlled.fail(new TypeError('network error'));
    });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(tracker.trackAgentResultLoadFinished).toHaveBeenCalledWith(
      expect.objectContaining({ searchResultCount: 0 })
    );
  });

  it('should not resend a view on re-entry', async () => {
    respondWith(streamOf(start, itemResults('A', 's1', ['a']), end));
    const { result } = renderOverview();
    await waitFor(() => expect(result.current.status).toBe('done'));

    act(() => setInView(true));
    act(() => setInView(false));
    act(() => setInView(true));

    expect(tracker.trackAgentResultView).toHaveBeenCalledTimes(1);
  });

  it("should send a click with the section's searchResultId", async () => {
    respondWith(streamOf(start, itemResults('Pants', 's2', ['Chinos']), end));
    const { result } = renderOverview();
    await waitFor(() => expect(result.current.status).toBe('done'));

    const [section] = result.current.sections;
    act(() => result.current.trackProductClick(section.products[0], section));

    expect(tracker.trackAgentResultClick).toHaveBeenCalledWith({
      intent: QUERY,
      intentResultId: 'r1',
      threadId: 't1',
      searchResultId: 's2',
      itemId: 'id-Chinos',
      itemName: 'Chinos',
    });
  });

  it('should tag events on a host client with the overview tag', async () => {
    let sentTag: unknown;
    tracker.trackAgentSubmit.mockImplementation(function (this: Tracker) {
      sentTag = this.options.version;
    });
    respondWith(controlledStream().stream);
    renderOverview();

    await waitFor(() => expect(tracker.trackAgentSubmit).toHaveBeenCalled());
    expect(sentTag).toBe(AGENT_OVERVIEW_CLIENT_TAG);
    expect(tracker.options.version).toBe('host-tag');
  });

  it('should send no events for a superseded request', async () => {
    const first = controlledStream();
    respondWith(first.stream);
    respondWith(controlledStream().stream);
    const { rerender } = renderOverview();
    rerender(build({ query: 'gift for dad' }));

    act(() => {
      first.push(start);
      first.push(itemResults('Stale', 's9', ['z']));
      first.push(end);
    });
    await act(() => Promise.resolve());

    expect(tracker.trackAgentResultLoadStarted).not.toHaveBeenCalled();
    expect(tracker.trackAgentResultLoadFinished).not.toHaveBeenCalled();
    expect(tracker.trackAgentSubmit).not.toHaveBeenCalledWith({
      intent: QUERY,
    });
  });

  it('should skip view and click for a section without searchResultId', async () => {
    const set = itemResults('A', 's1', ['a']);
    if (set.type === 'item_results') delete set.searchResultId;
    respondWith(streamOf(start, set, end));
    const { result } = renderOverview();
    await waitFor(() => expect(result.current.status).toBe('done'));

    act(() => setInView(true));
    const [section] = result.current.sections;
    act(() => result.current.trackProductClick(section.products[0], section));

    expect(tracker.trackAgentResultView).not.toHaveBeenCalled();
    expect(tracker.trackAgentResultClick).not.toHaveBeenCalled();
  });

  it('should skip methods the client lacks', async () => {
    cioJsClient = {
      options: tracker.options,
      tracker: { options: tracker.options },
    } as never;
    respondWith(streamOf(start, itemResults('A', 's1', ['a']), end));
    const { result } = renderOverview();
    await waitFor(() => expect(result.current.status).toBe('done'));
    act(() => setInView(true));
    const [section] = result.current.sections;
    expect(() =>
      act(() => result.current.trackProductClick(section.products[0], section))
    ).not.toThrow();
  });
});
