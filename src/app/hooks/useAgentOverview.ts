import { useEffect, useRef, useState } from 'react';

import type {
  IAgenticPromise,
  IAgentOverviewError,
  IAgentOverviewProps,
  IAgentOverviewSection,
  IProduct,
  UseAgentOverviewReturn,
} from '@src/types';
import toProduct from '@src/utils/toProduct';

import { AgentInsightsRequestError } from '../services/agentInsightsClient';
import {
  findAiOverviewPromise,
  streamAgentOverview,
} from '../services/agentOverviewClient';

/** The status the callback answers when search promised an overview but the agent produced none. */
const NO_OVERVIEW_STATUS = 204;

function initialState(promise: IAgenticPromise | null): UseAgentOverviewReturn {
  return {
    status: promise ? 'loading' : 'idle',
    message: '',
    sections: [],
    resultId: null,
    threadId: null,
    error: null,
    displayName: promise?.pod.display_name ?? null,
  };
}

/**
 * What a promise sends. A page re-rendering with new but equal promise objects keeps its overview;
 * a new search, or a filter on the same one, changes the URL or the body.
 */
function requestKey(promise: IAgenticPromise | null): string {
  return promise
    ? `${promise.callback_url}\n${JSON.stringify(promise.body)}`
    : '';
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
 * Streams the AI Overview that a Constructor search response promised: it sends the
 * `search_ai_overview` promise from `agenticPromises` to its callback URL, then gives the overview
 * message and each product set as they arrive. A new search response aborts the previous request.
 *
 * @example
 * ```tsx
 * const { status, message, sections } = useAgentOverview({
 *   agenticPromises: searchResponse.response.agentic_promises,
 * });
 * ```
 */
export default function useAgentOverview(
  props: IAgentOverviewProps
): UseAgentOverviewReturn {
  const { callbacks } = props;
  // The JavaScript bundle has no types, so anything may arrive here.
  const promise = findAiOverviewPromise(props.agenticPromises);
  const key = requestKey(promise);

  const [state, setState] = useState(() => initialState(promise));

  // A new request starts from a clean state in the same render, so no frame shows the previous
  // search's overview (React's "adjusting state when a prop changes"). The request keeps the
  // promise it started with, so an equal promise on a re-render doesn't restart it.
  const [request, setRequest] = useState({ key, promise });
  if (request.key !== key) {
    setRequest({ key, promise });
    setState(initialState(promise));
  }

  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  useEffect(() => {
    if (!request.promise) return undefined;
    const sent: IAgenticPromise = request.promise;

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

      for await (const event of streamAgentOverview(sent, controller.signal)) {
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
  }, [request]);

  return state;
}
