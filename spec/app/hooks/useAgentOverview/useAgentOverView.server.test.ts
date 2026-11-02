import { renderHookServerSide } from '@spec/__tests__/utils.server';
import * as factories from '@spec/factory';

import useAgentOverview from '@src/app/hooks/useAgentOverview';
import { streamAgentOverview } from '@src/app/services/agentOverviewClient';

vi.mock('@src/app/services/agentOverviewClient', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  streamAgentOverview: vi.fn(),
}));

describe(`${useAgentOverview.name}: server`, () => {
  const props = factories.agentOverviewProps.build();

  it('should render the loading state without requesting on the server', () => {
    const { result } = renderHookServerSide(() => useAgentOverview(props), {
      initialProps: props,
    });
    expect(result).toEqual({
      status: 'loading',
      message: '',
      sections: [],
      resultId: null,
      threadId: null,
      error: null,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      trackProductClick: expect.any(Function),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      viewRef: expect.any(Function),
    });
    expect(streamAgentOverview).not.toHaveBeenCalled();
  });
});
