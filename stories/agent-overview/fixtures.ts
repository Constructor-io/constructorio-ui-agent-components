import type { ArgTypes } from '@storybook/react-vite';

import type { IAgentOverviewProps } from '@src/types';

export const DEMO_API_KEY = 'key_x6UnCVRZaJgIHFQD';
/** The demo index answers this with one product from each of several categories. */
export const query = 'I want to buy casual style';
/** The demo index answers this with one set of products. */
export const singleCategoryQuery =
  'comfortable shirts for a summer beach wedding';

export const demoArgs: IAgentOverviewProps = {
  apiKey: DEMO_API_KEY,
  query,
};

export const argTypes: Partial<ArgTypes<IAgentOverviewProps>> = {
  cioJsClient: { control: false },
  pageContext: {
    description:
      'Where the overview is shown. See the [Integration Guide](?path=/docs/agent-overview-integration-guide--docs).',
  },
  theme: {
    description:
      'CSS custom property overrides. See [Customization](?path=/docs/agent-overview-customization--docs#theming).',
  },
  callbacks: {
    control: false,
    description: 'See [Callbacks](?path=/docs/agent-overview-callbacks--docs).',
  },
  translations: {
    description:
      'UI string overrides. See [Customization](?path=/docs/agent-overview-customization--docs#translations).',
  },
};
