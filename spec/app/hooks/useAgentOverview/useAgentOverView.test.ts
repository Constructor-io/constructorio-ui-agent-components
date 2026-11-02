import { act, renderHook, waitFor } from '@testing-library/react';

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
const cioJsClient = { options: { apiKey: 'k' } } as never;

// cioJsClient is added after build(): fishery deep-copies params, and a new client object on every
// render would start a new request on every render.
function build(overrides: Partial<IAgentOverviewProps> = {}) {
  return {
    ...factories.agentOverviewProps.build({ apiKey: undefined, ...overrides }),
    cioJsClient,
  };
}

describe('useAgentOverview', () => {
  afterEach(() => {
    mockedStream.mockReset();
  });

  it('should stay idle for a blank query', () => {
    const { result } = renderHook(() =>
      useAgentOverview(build({ query: '  ' }))
    );
    expect(result.current.status).toBe('idle');
    expect(mockedStream).not.toHaveBeenCalled();
  });

  it('should go loading, streaming, then done with the message and sections', async () => {
    const controlled = controlledStream();
    mockedStream.mockReturnValue(controlled.stream);
    const { result } = renderHook(() => useAgentOverview(build()));

    expect(result.current.status).toBe('loading');
    expect(mockedStream).toHaveBeenCalledWith(
      cioJsClient,
      { query: 'I want to buy casual style', pageContext: undefined },
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

  it('should be no-overview on a 422 and call onNoOverview once', async () => {
    const onNoOverview = vi.fn();
    const controlled = controlledStream();
    mockedStream.mockReturnValue(controlled.stream);
    const { result } = renderHook(() =>
      useAgentOverview(build({ callbacks: { onNoOverview } }))
    );

    act(() =>
      controlled.fail(
        new AgentInsightsRequestError(422, 'not suitable', {
          code: 'client_error',
        })
      )
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

  it('should keep products that arrived before a server_error and end done', async () => {
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
    const { result } = renderHook(() => useAgentOverview(build()));
    await waitFor(() => expect(result.current.status).toBe('done'));
    expect(result.current.sections).toHaveLength(1);
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

    rerender(build({ query: 'gift for dad', callbacks: { onNoOverview } }));
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

  it('should abort the previous request when the query changes', () => {
    mockedStream.mockImplementation(() => controlledStream().stream);
    const { rerender } = renderHook((props) => useAgentOverview(props), {
      initialProps: build(),
    });
    const firstSignal = mockedStream.mock.calls[0][2]!;

    rerender(build({ query: 'gift for dad' }));

    expect(firstSignal.aborted).toBe(true);
    expect(mockedStream).toHaveBeenCalledTimes(2);
  });

  it('should refetch when pageContext values change but not for a new equal object', () => {
    mockedStream.mockImplementation(() => controlledStream().stream);
    const { rerender } = renderHook((props) => useAgentOverview(props), {
      initialProps: build({ pageContext: { searchTerm: 'a' } }),
    });
    rerender(build({ pageContext: { searchTerm: 'a' } }));
    expect(mockedStream).toHaveBeenCalledTimes(1);
    rerender(build({ pageContext: { searchTerm: 'b' } }));
    expect(mockedStream).toHaveBeenCalledTimes(2);
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
