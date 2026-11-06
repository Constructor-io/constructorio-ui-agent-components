import { act, renderHook, waitFor } from '@testing-library/react';
import type { MockInstance } from 'vitest';

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
import { streamAgentOverview } from '@src/app/services/agentOverviewClient';
import type { IAgentOverviewProps } from '@src/types';

vi.mock('@src/app/services/agentOverviewClient', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  streamAgentOverview: vi.fn(),
}));

const mockedStream = vi.mocked(streamAgentOverview);

// build() deep-copies its params, so every call makes new but equal promise objects, as a page
// does when it re-renders with the same search response.
function build(overrides: Partial<IAgentOverviewProps> = {}) {
  return factories.agentOverviewProps.build(overrides);
}

const nextSearch = () => [factories.aiOverviewPromise('gift for dad', 'p2')];

describe('useAgentOverview', () => {
  afterEach(() => {
    mockedStream.mockReset();
  });

  it.each([
    ['no agenticPromises', undefined],
    ['an empty array', []],
    [
      'only another pod',
      [{ pod: { id: 'other' }, callback_url: 'u', body: {} }],
    ],
  ])('should stay idle and make no request with %s', (_, agenticPromises) => {
    const onNoOverview = vi.fn();
    const { result } = renderHook(() =>
      useAgentOverview({ agenticPromises, callbacks: { onNoOverview } })
    );
    expect(result.current.status).toBe('idle');
    expect(result.current.displayName).toBeNull();
    expect(mockedStream).not.toHaveBeenCalled();
    expect(onNoOverview).not.toHaveBeenCalled();
  });

  it("should give the promise's display name", () => {
    mockedStream.mockReturnValue(controlledStream().stream);
    const { result } = renderHook(() => useAgentOverview(build()));
    expect(result.current.displayName).toBe('AI Overview');
  });

  it('should go loading, streaming, then done with the message and sections', async () => {
    const controlled = controlledStream();
    mockedStream.mockReturnValue(controlled.stream);
    const { result } = renderHook(() => useAgentOverview(build()));

    expect(result.current.status).toBe('loading');
    expect(mockedStream).toHaveBeenCalledWith(
      factories.aiOverviewPromise(),
      expect.any(AbortSignal)
    );

    act(() => controlled.push(start));
    await waitFor(() => expect(result.current.status).toBe('streaming'));
    expect(result.current.resultId).toBe('r1');
    expect(result.current.threadId).toBe('t1');

    act(() => controlled.push(message('Here is a casual selection.')));
    await waitFor(() =>
      expect(result.current.message).toBe('Here is a casual selection.')
    );

    act(() => controlled.push(itemResults('Casual Shirt', 's1', ['Shirt'])));
    await waitFor(() => expect(result.current.sections).toHaveLength(1));
    expect(result.current.status).toBe('streaming');

    act(() => controlled.push(itemResults('Casual Pants', 's2', ['Pants'])));
    act(() => controlled.push(end));
    await waitFor(() => expect(result.current.status).toBe('done'));
    expect(result.current.sections).toEqual([
      {
        title: 'Casual Shirt',
        searchResultId: 's1',
        products: [
          expect.objectContaining({ itemName: 'Shirt', itemId: 'id-Shirt' }),
        ],
      },
      {
        title: 'Casual Pants',
        searchResultId: 's2',
        products: [expect.objectContaining({ itemName: 'Pants' })],
      },
    ]);
  });

  it('should label the product of a one-product set with its title', async () => {
    mockedStream.mockReturnValue(
      streamOf(start, itemResults('Casual Shirt', 's1', ['Shirt']), end)
    );
    const { result } = renderHook(() => useAgentOverview(build()));
    await waitFor(() => expect(result.current.status).toBe('done'));
    expect(result.current.sections[0].products[0].label).toBe('Casual Shirt');
  });

  it('should not label a set of several products that loses all but one to filtering', async () => {
    const set = itemResults('Summer Shirts', 's1', ['a', 'b', 'c']);
    if (set.type === 'item_results') {
      delete set.results[1].data!.image_url;
      delete set.results[2].data!.image_url;
    }
    mockedStream.mockReturnValue(streamOf(start, set, end));
    const { result } = renderHook(() => useAgentOverview(build()));
    await waitFor(() => expect(result.current.status).toBe('done'));
    expect(result.current.sections[0].products).toHaveLength(1);
    expect(result.current.sections[0].products[0].label).toBeUndefined();
  });

  it('should not label sets of several products', async () => {
    mockedStream.mockReturnValue(
      streamOf(start, itemResults('Summer Shirts', 's1', ['a', 'b']), end)
    );
    const { result } = renderHook(() => useAgentOverview(build()));
    await waitFor(() => expect(result.current.status).toBe('done'));
    expect(
      result.current.sections[0].products.map((product) => product.label)
    ).toEqual([undefined, undefined]);
  });

  it('should join several messages with a blank line', async () => {
    mockedStream.mockReturnValue(
      streamOf(
        start,
        message('One.'),
        message('Two.'),
        itemResults('A', 's1', ['a']),
        end
      )
    );
    const { result } = renderHook(() => useAgentOverview(build()));
    await waitFor(() => expect(result.current.status).toBe('done'));
    expect(result.current.message).toBe('One.\n\nTwo.');
  });

  it('should skip sets with no products a card can show', async () => {
    const nameOnly = itemResults('Hidden', 's0', ['x']);
    if (nameOnly.type === 'item_results') nameOnly.results = [{ value: 'x' }];
    mockedStream.mockReturnValue(
      streamOf(start, nameOnly, itemResults('Shown', 's1', ['a']), end)
    );
    const { result } = renderHook(() => useAgentOverview(build()));
    await waitFor(() => expect(result.current.status).toBe('done'));
    expect(result.current.sections.map((s) => s.title)).toEqual(['Shown']);
  });

  it('should be no-overview on a 204 and call onNoOverview once', async () => {
    const onNoOverview = vi.fn();
    const controlled = controlledStream();
    mockedStream.mockReturnValue(controlled.stream);
    const { result } = renderHook(() =>
      useAgentOverview(build({ callbacks: { onNoOverview } }))
    );

    act(() =>
      controlled.fail(new AgentInsightsRequestError(204, 'no content'))
    );
    await waitFor(() => expect(result.current.status).toBe('no-overview'));
    expect(onNoOverview).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('should be no-overview when the stream ends without products', async () => {
    mockedStream.mockReturnValue(streamOf(start, message('Hmm.'), end));
    const { result } = renderHook(() => useAgentOverview(build()));
    await waitFor(() => expect(result.current.status).toBe('no-overview'));
  });

  it('should be error on a 503 and call onError with status and code', async () => {
    const onError = vi.fn();
    const controlled = controlledStream();
    mockedStream.mockReturnValue(controlled.stream);
    const { result } = renderHook(() =>
      useAgentOverview(build({ callbacks: { onError } }))
    );

    act(() =>
      controlled.fail(
        new AgentInsightsRequestError(503, 'Upstream down', {
          code: 'upstream_service_error',
        })
      )
    );
    await waitFor(() => expect(result.current.status).toBe('error'));
    const error = {
      status: 503,
      code: 'upstream_service_error',
      message: 'Upstream down',
    };
    expect(result.current.error).toEqual(error);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should be error with status 0 for a network failure', async () => {
    const controlled = controlledStream();
    mockedStream.mockReturnValue(controlled.stream);
    const { result } = renderHook(() => useAgentOverview(build()));
    act(() => controlled.fail(new TypeError('Failed to fetch')));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toEqual({
      status: 0,
      message: 'Failed to fetch',
    });
  });

  it('should be error on a server_error even after products, as the guide hides the overview', async () => {
    const onError = vi.fn();
    mockedStream.mockReturnValue(
      streamOf(
        start,
        itemResults('A', 's1', ['a']),
        {
          type: 'server_error',
          resultId: 'r1',
          statusCode: 500,
          message: 'boom',
        },
        end
      )
    );
    const { result } = renderHook(() =>
      useAgentOverview(build({ callbacks: { onError } }))
    );
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toEqual({ status: 500, message: 'boom' });
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('should be no-overview when the agent declines the query with a 422', async () => {
    const onNoOverview = vi.fn();
    const onError = vi.fn();
    const controlled = controlledStream();
    mockedStream.mockReturnValue(controlled.stream);
    const { result } = renderHook(() =>
      useAgentOverview(build({ callbacks: { onNoOverview, onError } }))
    );

    act(() =>
      controlled.fail(
        new AgentInsightsRequestError(
          422,
          'The provided query is not suitable for AI Shopping Agent processing',
          { code: 'client_error' }
        )
      )
    );
    await waitFor(() => expect(result.current.status).toBe('no-overview'));
    expect(onNoOverview).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('should keep products on screen when the connection drops mid-stream', async () => {
    const onError = vi.fn();
    const controlled = controlledStream();
    mockedStream.mockReturnValue(controlled.stream);
    const { result } = renderHook(() =>
      useAgentOverview(build({ callbacks: { onError } }))
    );

    act(() => {
      controlled.push(start);
      controlled.push(itemResults('A', 's1', ['a']));
      controlled.fail(new TypeError('network error'));
    });

    await waitFor(() => expect(result.current.status).toBe('done'));
    expect(result.current.sections).toHaveLength(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('should be error on a server_error with no products', async () => {
    mockedStream.mockReturnValue(
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
    const { result } = renderHook(() => useAgentOverview(build()));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toEqual({ status: 500, message: 'boom' });
  });

  describe('when a callback throws', () => {
    // The test setup replaces console.error for each test, so spy on it in beforeEach.
    let consoleError: MockInstance<typeof console.error>;
    // The request's promise chain settles after the callback runs.
    const settle = () =>
      act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
    beforeEach(() => {
      consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => consoleError.mockRestore());

    it('should stay no-overview and not report the exception as a request error', async () => {
      const bug = new Error('site bug');
      const onNoOverview = vi.fn(() => {
        throw bug;
      });
      const onError = vi.fn();
      mockedStream.mockReturnValue(streamOf(start, message('Hmm.'), end));
      const { result } = renderHook(() =>
        useAgentOverview(build({ callbacks: { onNoOverview, onError } }))
      );

      await waitFor(() => expect(onNoOverview).toHaveBeenCalledTimes(1));
      await settle();
      expect(result.current.status).toBe('no-overview');
      expect(result.current.error).toBeNull();
      expect(onError).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith(expect.any(String), bug);
    });

    it('should call a throwing onError only once', async () => {
      const onError = vi.fn(() => {
        throw new Error('site bug');
      });
      mockedStream.mockReturnValue(
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
      const { result } = renderHook(() =>
        useAgentOverview(build({ callbacks: { onError } }))
      );

      await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
      await settle();
      expect(onError).toHaveBeenCalledTimes(1);
      expect(result.current.error).toEqual({ status: 500, message: 'boom' });
    });
  });

  it('should ignore events from a superseded request', async () => {
    const first = controlledStream();
    const second = controlledStream();
    mockedStream
      .mockReturnValueOnce(first.stream)
      .mockReturnValueOnce(second.stream);
    const onNoOverview = vi.fn();
    const { result, rerender } = renderHook(
      (props) => useAgentOverview(props),
      {
        initialProps: build({ callbacks: { onNoOverview } }),
      }
    );

    rerender(
      build({ agenticPromises: nextSearch(), callbacks: { onNoOverview } })
    );
    act(() => {
      first.push(start);
      first.push(message('stale'));
      first.push(itemResults('Stale', 's9', ['z']));
      first.push(end);
    });
    act(() => {
      second.push(start);
      second.push(message('fresh'));
      second.push(itemResults('Fresh', 's1', ['a']));
      second.push(end);
    });

    await waitFor(() => expect(result.current.status).toBe('done'));
    expect(result.current.message).toBe('fresh');
    expect(result.current.sections.map((s) => s.title)).toEqual(['Fresh']);
    expect(onNoOverview).not.toHaveBeenCalled();
  });

  it('should abort the previous request for a new search', () => {
    mockedStream.mockImplementation(() => controlledStream().stream);
    const { rerender } = renderHook((props) => useAgentOverview(props), {
      initialProps: build(),
    });
    const firstSignal = mockedStream.mock.calls[0][1]!;

    rerender(build({ agenticPromises: nextSearch() }));

    expect(firstSignal.aborted).toBe(true);
    expect(mockedStream).toHaveBeenCalledTimes(2);
  });

  it('should not refetch for an equal promise, but should when only the body changes', () => {
    mockedStream.mockImplementation(() => controlledStream().stream);
    const { rerender } = renderHook((props) => useAgentOverview(props), {
      initialProps: build(),
    });
    rerender(build());
    expect(mockedStream).toHaveBeenCalledTimes(1);

    // A filter applied to the same search: same URL, new page_context.
    const filtered = factories.aiOverviewPromise();
    filtered.body = { ...(filtered.body as object), filtered: true };
    rerender(build({ agenticPromises: [filtered] }));
    expect(mockedStream).toHaveBeenCalledTimes(2);
  });

  it('should reset to idle when a new search has no promise', async () => {
    mockedStream.mockReturnValue(
      streamOf(start, itemResults('A', 's1', ['a']), end)
    );
    const { result, rerender } = renderHook(
      (props) => useAgentOverview(props),
      { initialProps: build() }
    );
    await waitFor(() => expect(result.current.status).toBe('done'));

    rerender(build({ agenticPromises: [] }));
    expect(result.current.status).toBe('idle');
    expect(result.current.sections).toEqual([]);
  });

  it('should not refetch when only callbacks change', () => {
    mockedStream.mockImplementation(() => controlledStream().stream);
    const { rerender } = renderHook((props) => useAgentOverview(props), {
      initialProps: build({ callbacks: { onError: vi.fn() } }),
    });
    rerender(build({ callbacks: { onError: vi.fn() } }));
    expect(mockedStream).toHaveBeenCalledTimes(1);
  });
});
