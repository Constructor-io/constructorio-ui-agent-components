import type { Meta, StoryObj } from '@storybook/react-vite';

import CioAgentOverview from '@src/index';

import { argTypes, demoArgs } from '../fixtures';

const meta: Meta<typeof CioAgentOverview> = {
  title: 'Agent Overview/Components & Utilities/CioAgentOverview',
  component: CioAgentOverview,
  tags: ['autodocs'],
  parameters: {
    a11y: { test: 'error' },
    controls: { expanded: true },
    docs: {
      description: {
        component:
          'Streams the AI Overview for a `query`: a short summary, then the products picked for it. Renders nothing when the query gets no overview. The default export. See the [Integration Guide](?path=/docs/agent-overview-integration-guide--docs).',
      },
    },
  },
  argTypes,
};

export default meta;

type Story = StoryObj<typeof CioAgentOverview>;

export const Default: Story = { args: demoArgs };
