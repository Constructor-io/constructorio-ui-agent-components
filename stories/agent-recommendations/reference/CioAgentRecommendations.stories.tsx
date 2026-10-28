import type { Meta, StoryObj } from '@storybook/react-vite';

import { CioAgentRecommendations } from '@src/index';

import { argTypes, demoArgs } from '../fixtures';

const meta: Meta<typeof CioAgentRecommendations> = {
  title: 'Agent Recommendations/Components & Utilities/CioAgentRecommendations',
  component: CioAgentRecommendations,
  tags: ['autodocs'],
  parameters: {
    a11y: { test: 'error' },
    controls: { expanded: true },
    docs: {
      description: {
        component:
          'A recommendations pod for a product page: a title, a carousel of products picked for `itemId`, and options that refine it. See the [Integration Guide](?path=/docs/agent-recommendations-integration-guide--docs).',
      },
    },
  },
  argTypes,
};

export default meta;

type Story = StoryObj<typeof CioAgentRecommendations>;

export const Default: Story = { args: demoArgs };
