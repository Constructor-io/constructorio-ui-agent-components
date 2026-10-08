import type { Meta, StoryObj } from '@storybook/react-vite';

import CioAgentOverview from '@src/index';

import { demoArgs } from '../fixtures';

const meta: Meta<typeof CioAgentOverview> = {
  title: 'Examples/Layout',
  component: CioAgentOverview,
  tags: ['!dev'],
  parameters: { a11y: { test: 'error' } },
  args: demoArgs,
};

export default meta;

type Story = StoryObj<typeof CioAgentOverview>;

export const SmallContainer: Story = {
  render: (args) => (
    <div className="small-container-example-wrapper">
      <div className="small-container-example">
        <CioAgentOverview {...args} />
      </div>
    </div>
  ),
};
