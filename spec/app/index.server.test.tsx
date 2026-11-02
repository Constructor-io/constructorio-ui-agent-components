import { renderToString } from 'react-dom/server';

import * as factories from '@spec/factory';

import CioAgentOverview from '@src/app';
import type { IAgentOverviewProps } from '@src/types';

describe(`${CioAgentOverview.name}: server`, () => {
  const props: IAgentOverviewProps = factories.agentOverviewProps.build();

  it('renders the root with the loading skeleton', () => {
    const view = renderToString(<CioAgentOverview {...props} />);
    expect(view).toContain('cio-agent-overview-root');
    expect(view).toContain('cio-agent-overview-skeleton-section');
  });
});
