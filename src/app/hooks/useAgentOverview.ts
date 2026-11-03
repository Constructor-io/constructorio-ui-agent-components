import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  IAgentOverviewError,
  IAgentOverviewProps,
  IAgentOverviewSection,
  IProduct,
  UseAgentOverviewReturn,
} from '@src/types';
import toProduct from '@src/utils/toProduct';

import { AgentInsightsRequestError } from '../services/agentInsightsClient';
import {
  createAgentOverviewClient,
  streamAgentOverview,
} from '../services/agentOverviewClient';

/** The HTTP status the search endpoint answers when a query gets no overview. */
const NO_OVERVIEW_STATUS = 422;

function initialState(query: string): UseAgentOverviewReturn {
  return {
    status: query.trim() ? 'loading' : 'idle',
    message: '',
    sections: [],
    resultId: null,
    threadId: null,
    error: null,
  };
}

function toError(err: unknown): IAgentOverviewError {
  if (err instanceof AgentInsightsRequestError) {
    return {
      status: err.status,
      ...(err.code && { code: err.code }),
      message: err.message,
    };
  }
  return {
    status: 0,
    message: err instanceof Error ? err.message : String(err),
  };
}

function isAbort(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

/**
 * Calls one of the site's callbacks. An exception in the site's code is logged, so it can't be
 * taken for a failed request.
 */
function notify(callback: () => void): void {
  try {
    callback();
  } catch (err) {
    console.error('CioAgentOverview: a callback threw', err);
  }
}

/**
 * Streams the AI Overview for `query` from `/v1/agent_insights/search`: the overview message,
 * then each product set as it arrives. A new query aborts the previous request.
 *
 * @example
 * ```tsx
 * const { status, message, sections } = useAgentOverview({ apiKey: 'YOUR_API_KEY', query });
 * ```
 */
export default function useAgentOverview(
  props: IAgentOverviewProps
): UseAgentOverviewReturn {
  const { apiKey, cioJsClient, pageContext, callbacks } = props;
  // The JavaScript bundle has no types: treat a missing query as a blank one.
  const query = props.query ?? '';
  const pageType = pageContext?.pageType;
  const searchTerm = pageContext?.searchTerm;
  const client = useMemo(
    () => createAgentOverviewClient({ apiKey, cioJsClient }),
    [apiKey, cioJsClient]
  );

  const [state, setState] = useState(() => initialState(query));

  // A new request starts from a clean state in the same render, so no frame shows the previous
  // query's overview (React's "adjusting state when a prop changes").
  const request = { client, query, pageType, searchTerm };
  const [lastRequest, setLastRequest] = useState(request);
  if (
    lastRequest.client !== client ||
    lastRequest.query !== query ||
    lastRequest.pageType !== pageType ||
    lastRequest.searchTerm !== searchTerm
  ) {
    setLastRequest(request);
    setState(initialState(query));
  }

  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  useEffect(() => {
    if (!query.trim()) return undefined;

    const controller = new AbortController();
    const isCurrent = () => !controller.signal.aborted;
    const update = (patch: Partial<UseAgentOverviewReturn>) => {
      if (isCurrent()) setState((prev) => ({ ...prev, ...patch }));
    };

    // Outside run() so a stream that breaks off can still finish with what already arrived.
    const sections: IAgentOverviewSection[] = [];

    async function run() {
      const messages: string[] = [];
      let serverError: IAgentOverviewError | null = null;

      for await (const event of streamAgentOverview(
        client,
        {
          query,
          pageContext:
            pageType || searchTerm !== undefined
              ? { pageType, searchTerm }
              : undefined,
        },
        controller.signal
      )) {
        if (!isCurrent()) return;
        if (event.type === 'start') {
          update({
            status: 'streaming',
            resultId: event.resultId,
            threadId: event.threadId ?? null,
          });
        } else if (event.type === 'message') {
          messages.push(event.text);
          update({ message: messages.join('\n\n') });
        } else if (event.type === 'item_results') {
          const products = event.results
            .map(toProduct)
            .filter((product): product is IProduct => product !== null);
          if (products.length > 0) {
            sections.push({
              title: event.title.trim(),
              ...(event.searchResultId && {
                searchResultId: event.searchResultId,
              }),
              products,
            });
            update({ sections: [...sections] });
          }
        } else if (event.type === 'server_error') {
          serverError = { status: event.statusCode, message: event.message };
        } else if (event.type === 'end') {
          break;
        }
      }

      if (!isCurrent()) return;
      if (sections.length > 0) {
        update({ status: 'done' });
      } else if (serverError) {
        update({ status: 'error', error: serverError });
        notify(() => callbacksRef.current?.onError?.(serverError));
      } else {
        update({ status: 'no-overview' });
        notify(() => callbacksRef.current?.onNoOverview?.());
      }
    }

    run().catch((err: unknown) => {
      if (!isCurrent() || isAbort(err)) return;
      // The connection dropped after products were shown: keep them.
      if (sections.length > 0) {
        update({ status: 'done' });
        return;
      }
      if (
        err instanceof AgentInsightsRequestError &&
        err.status === NO_OVERVIEW_STATUS
      ) {
        update({ status: 'no-overview' });
        notify(() => callbacksRef.current?.onNoOverview?.());
        return;
      }
      const error = toError(err);
      update({ status: 'error', error });
      notify(() => callbacksRef.current?.onError?.(error));
    });

    return () => controller.abort();
  }, [client, query, pageType, searchTerm]);

  return state;
}
