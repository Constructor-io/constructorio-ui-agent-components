import type { Meta, StoryObj } from '@storybook/react-vite';

import { type DemoArgs, demoArgs } from '../fixtures';
import useDemoSearch from '../useDemoSearch';

import HeadlessTemplate from './HeadlessTemplate';

function Demo({ search, ...props }: DemoArgs) {
  const agenticPromises = useDemoSearch(search);
  return <HeadlessTemplate {...props} agenticPromises={agenticPromises} />;
}

const meta: Meta<DemoArgs> = {
  title: 'Agent Overview/Examples/Headless',
  component: HeadlessTemplate as Meta<DemoArgs>['component'],
  tags: ['!dev'],
  parameters: { a11y: { test: 'error' } },
  args: demoArgs,
  render: (args) => <Demo {...args} />,
};

export default meta;

type Story = StoryObj<DemoArgs>;

export const Default: Story = {};
