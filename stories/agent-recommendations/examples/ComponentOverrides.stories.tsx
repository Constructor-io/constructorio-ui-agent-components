import type { Meta, StoryObj } from '@storybook/react-vite';

import { CioAgentRecommendations } from '@src/index';

import { demoArgs } from '../fixtures';

import { partOverrides, rootOverride } from './overrides';

const meta: Meta<typeof CioAgentRecommendations> = {
  title: 'Agent Recommendations/Examples/Component Overrides',
  component: CioAgentRecommendations,
  tags: ['!dev'],
  parameters: { a11y: { test: 'error' } },
  args: demoArgs,
};

export default meta;

type Story = StoryObj<typeof CioAgentRecommendations>;

export const PartOverrides: Story = {
  args: { componentOverrides: partOverrides },
};

export const RootOverride: Story = {
  args: { componentOverrides: rootOverride },
};
