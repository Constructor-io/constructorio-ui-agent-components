import type { Meta, StoryObj } from '@storybook/react-vite';

import CioAgentOverview from '@src/index';

import { argTypes, demoArgs } from '../fixtures';

const meta: Meta<typeof CioAgentOverview> = {
  title: 'Components & Utilities/CioAgentOverview',
  component: CioAgentOverview,
  tags: ['autodocs'],
  parameters: {
    a11y: { test: 'error' },
    controls: { expanded: true },
    docs: {
      description: {
        component:
          'Streams category suggestions for an `intent`, then product sections once one is chosen. The default export. See the [Integration Guide](?path=/docs/guides-integration-guide--docs).',
      },
    },
  },
  argTypes,
};

export default meta;

type Story = StoryObj<typeof CioAgentOverview>;

export const Default: Story = { args: demoArgs };
