import type { Meta, StoryObj } from '@storybook/react-vite';

import { CioAgentRecommendations } from '@src/index';

import { recommendationsArgTypes, recommendationsDemoArgs } from '../fixtures';

const meta: Meta<typeof CioAgentRecommendations> = {
  title: 'Components & Utilities/CioAgentRecommendations',
  component: CioAgentRecommendations,
  tags: ['autodocs'],
  parameters: {
    a11y: { test: 'error' },
    controls: { expanded: true },
    docs: {
      description: {
        component:
          'A recommendations pod for a product page: a title, a carousel of products picked for `itemId`, and options that refine it. See [Recommendations](?path=/docs/guides-recommendations--docs).',
      },
    },
  },
  argTypes: recommendationsArgTypes,
};

export default meta;

type Story = StoryObj<typeof CioAgentRecommendations>;

export const Default: Story = { args: recommendationsDemoArgs };
