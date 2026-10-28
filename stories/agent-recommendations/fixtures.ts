import type { ArgTypes } from '@storybook/react-vite';

import type { IAgentRecommendationsProps } from '@src/types';

export const DEMO_API_KEY = 'key_x6UnCVRZaJgIHFQD';

// cspell:ignore CSHRT
export const demoArgs: IAgentRecommendationsProps = {
  apiKey: DEMO_API_KEY,
  itemId: 'CSHRT00585-blue black seersucker check',
  itemName: 'Stretch Riviera Short Sleeve Shirt (Blue Black Seersucker Check)',
  strategy: 'complementary_pod',
};

export const argTypes: Partial<ArgTypes<IAgentRecommendationsProps>> = {
  cioJsClient: { control: false },
  theme: {
    description:
      'CSS custom property overrides. See [Customization](?path=/docs/agent-recommendations-customization--docs#theming).',
  },
  callbacks: {
    control: false,
    description:
      'See [Callbacks](?path=/docs/agent-recommendations-callbacks--docs).',
  },
  componentOverrides: {
    control: false,
    description:
      'See [Custom UI](?path=/docs/agent-recommendations-custom-ui--docs).',
  },
  children: { control: false },
  abTest: {
    description:
      'See [Tracking](?path=/docs/agent-recommendations-ab-testing--docs).',
  },
  trackingConfigs: {
    description:
      'See [Tracking](?path=/docs/agent-recommendations-ab-testing--docs).',
  },
  translations: {
    description:
      'UI string overrides. See [Customization](?path=/docs/agent-recommendations-customization--docs#translations).',
  },
};
