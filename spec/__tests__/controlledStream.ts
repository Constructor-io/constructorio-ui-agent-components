import type { AgentInsightsEvent } from '@src/app/services/agentInsightsTypes';

/** An event stream a test feeds one event at a time, then ends or fails. */
export interface ControlledStream {
  stream: AsyncGenerator<AgentInsightsEvent>;
  push: (event: AgentInsightsEvent) => void;
  finish: () => void;
  fail: (error: unknown) => void;
}

export function controlledStream(): ControlledStream {
  const queue: Array<
    | { kind: 'event'; event: AgentInsightsEvent }
    | { kind: 'end' }
    | { kind: 'error'; error: unknown }
  > = [];
  let wake: (() => void) | null = null;

  function enqueue(item: (typeof queue)[number]) {
    queue.push(item);
    wake?.();
    wake = null;
  }

  async function* run(): AsyncGenerator<AgentInsightsEvent> {
    for (;;) {
      if (queue.length === 0) {
        await new Promise<void>((resolve) => {
          wake = resolve;
        });
      }
      const item = queue.shift()!;
      if (item.kind === 'end') return;
      if (item.kind === 'error') throw item.error;
      yield item.event;
    }
  }

  return {
    stream: run(),
    push: (event) => enqueue({ kind: 'event', event }),
    finish: () => enqueue({ kind: 'end' }),
    fail: (error) => enqueue({ kind: 'error', error }),
  };
}

export function streamOf(
  ...events: AgentInsightsEvent[]
): AsyncGenerator<AgentInsightsEvent> {
  const controlled = controlledStream();
  events.forEach(controlled.push);
  controlled.finish();
  return controlled.stream;
}

export const RESULT_ID = 'r1';

export function itemResults(
  title: string,
  searchResultId: string,
  names: string[]
): AgentInsightsEvent {
  return {
    type: 'item_results',
    resultId: RESULT_ID,
    threadId: 't1',
    title,
    searchResultId,
    results: names.map((name) => ({
      value: name,
      data: {
        id: `id-${name}`,
        image_url: `https://example.com/${name}.jpg`,
        url: `/p/${name}`,
        price: 10,
      },
    })),
  };
}

export const start: AgentInsightsEvent = {
  type: 'start',
  resultId: RESULT_ID,
  threadId: 't1',
};
export const end: AgentInsightsEvent = {
  type: 'end',
  resultId: RESULT_ID,
  threadId: 't1',
};
export function message(text: string): AgentInsightsEvent {
  return { type: 'message', resultId: RESULT_ID, threadId: 't1', text };
}
