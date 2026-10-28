import type { ArgTypes } from '@storybook/react-vite';

import type { IAgentRecommendationsProps } from '@src/types';

export const DEMO_API_KEY = 'key_x6UnCVRZaJgIHFQD';

// TODO: the demo key has no recommendations strategy configured yet, so this pod renders nothing
// until Constructor adds one for it.
export const demoArgs: IAgentRecommendationsProps = {
  apiKey: DEMO_API_KEY,
  itemId: 'DEMO_ITEM_ID',
  strategy: 'complementary_pod',
};

export const argTypes: Partial<ArgTypes<IAgentRecommendationsProps>> = {
  cioJsClient: { control: false },
  callbacks: {
    control: false,
    description:
      'See the [Integration Guide](?path=/docs/agent-recommendations-integration-guide--docs#callbacks).',
  },
};
