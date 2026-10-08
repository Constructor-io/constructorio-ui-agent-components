import type { ArgTypes } from '@storybook/react-vite';

import type { IAgentOverviewProps } from '@src/types';

export const DEMO_API_KEY = 'key_x6UnCVRZaJgIHFQD';
export const intent = 'I want to buy casual style';
export const domains = {
  suggestions: 'searchbar',
  results: 'explorer',
};

export const demoArgs: IAgentOverviewProps = {
  apiKey: DEMO_API_KEY,
  intent,
  domains,
  callbacks: {
    getViewMoreUrl: (section) =>
      `/search?q=${encodeURIComponent(section.title)}`,
  },
};

export const argTypes: Partial<ArgTypes<IAgentOverviewProps>> = {
  cioJsClient: { control: false },
  theme: {
    description:
      'CSS custom property overrides. See [Customization](?path=/docs/guides-customization--docs#theming).',
  },
  callbacks: {
    control: false,
    description: 'See [Callbacks](?path=/docs/guides-callbacks--docs).',
  },
  translations: {
    description:
      'UI string overrides. See [Customization](?path=/docs/guides-customization--docs#translations).',
  },
};
