import type { Meta, StoryObj } from '@storybook/react-vite';

import CioAgentOverview from '@src/index';

import { type DemoArgs, demoArgs, singleCategorySearch } from '../fixtures';
import useDemoSearch from '../useDemoSearch';

function Demo({ search, ...props }: DemoArgs) {
  const agenticPromises = useDemoSearch(search);
  return <CioAgentOverview {...props} agenticPromises={agenticPromises} />;
}

const meta: Meta<DemoArgs> = {
  title: 'Agent Overview/Examples/Layout',
  component: CioAgentOverview as Meta<DemoArgs>['component'],
  tags: ['!dev'],
  parameters: { a11y: { test: 'error' } },
  args: demoArgs,
  render: (args) => <Demo {...args} />,
};

export default meta;

type Story = StoryObj<DemoArgs>;

export const SmallContainer: Story = {
  render: (args) => (
    <div className="small-container-example-wrapper">
      <div className="small-container-example">
        <Demo {...args} />
      </div>
    </div>
  ),
};

export const MultiCategory: Story = {};

export const SingleCategory: Story = {
  args: { search: singleCategorySearch },
};
