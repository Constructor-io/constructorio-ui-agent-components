import { useLayoutEffect } from 'react';

import { createRoot, type Root } from 'react-dom/client';

import {
  controlledStream,
  end,
  itemResults,
  start,
} from '@spec/__tests__/controlledStream';
import * as factories from '@spec/factory';

import useAgentOverview from '@src/app/hooks/useAgentOverview';
import { streamAgentOverview } from '@src/app/services/agentOverviewClient';
import type { IAgenticPromise, UseAgentOverviewReturn } from '@src/types';

vi.mock('@src/app/services/agentOverviewClient', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  streamAgentOverview: vi.fn(),
}));

const mockedStream = vi.mocked(streamAgentOverview);

/** Blocks the thread, as a heavy results page does while it commits. */
function busyWait(ms: number) {
  const until = performance.now() + ms;
  while (performance.now() < until) {
    // Spin.
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 50));

// Rendered outside act(), so React schedules passive effects as it does in a browser: after a slow
// commit, the scheduler yields before running them, and the old request is aborted only then.
describe('useAgentOverview: a slow commit', () => {
  const reactGlobal = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
  let actEnvironment: boolean | undefined;
  let root: Root;
  let container: HTMLElement;
  let latest: UseAgentOverviewReturn;
  let onCommit: (() => void) | null;

  function Overview({ promises }: { promises: IAgenticPromise[] }) {
    latest = useAgentOverview({
      agenticPromises: promises,
      callbacks: { onNoOverview, onError },
    });
    useLayoutEffect(() => {
      onCommit?.();
    });
    return null;
  }

  const onNoOverview = vi.fn();
  const onError = vi.fn();

  beforeEach(() => {
    actEnvironment = reactGlobal.IS_REACT_ACT_ENVIRONMENT;
    reactGlobal.IS_REACT_ACT_ENVIRONMENT = false;
    container = document.createElement('div');
    root = createRoot(container);
    onCommit = null;
  });

  afterEach(() => {
    root.unmount();
    reactGlobal.IS_REACT_ACT_ENVIRONMENT = actEnvironment;
    mockedStream.mockReset();
    onNoOverview.mockReset();
    onError.mockReset();
  });

  it("should keep the old search's late events out of the new search's overview", async () => {
    const oldStream = controlledStream();
    const newStream = controlledStream();
    mockedStream
      .mockReturnValueOnce(oldStream.stream)
      .mockReturnValueOnce(newStream.stream);

    root.render(
      <Overview promises={[factories.aiOverviewPromise('old search', 'p1')]} />
    );
    await flush();
    oldStream.push(start);
    await flush();

    // The new search commits slowly, and the old stream sends products and ends meanwhile.
    onCommit = () => {
      onCommit = null;
      oldStream.push(itemResults('Old products', 's-old', ['stale']));
      oldStream.push(end);
      busyWait(20);
    };
    root.render(
      <Overview promises={[factories.aiOverviewPromise('new search', 'p2')]} />
    );
    await flush();

    expect(latest.status).toBe('loading');
    expect(latest.sections).toEqual([]);
    expect(onNoOverview).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});
