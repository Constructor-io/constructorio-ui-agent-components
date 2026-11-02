import { Factory } from 'fishery';

import type { IAgentOverviewProps } from '../../src/types';

export const agentOverviewProps = Factory.define<IAgentOverviewProps>(() => ({
  apiKey: 'DEMO_API_KEY',
  query: 'I want to buy casual style',
}));
