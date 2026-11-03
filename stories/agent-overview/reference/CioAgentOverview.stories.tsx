import type { Meta, StoryObj } from '@storybook/react-vite';

import CioAgentOverview from '@src/index';

import { argTypes, type DemoArgs, demoArgs } from '../fixtures';
import useDemoSearch from '../useDemoSearch';

function Demo({ search, ...props }: DemoArgs) {
  const agenticPromises = useDemoSearch(search);
  return <CioAgentOverview {...props} agenticPromises={agenticPromises} />;
}

const meta: Meta<DemoArgs> = {
  title: 'Agent Overview/Components & Utilities/CioAgentOverview',
  component: CioAgentOverview as Meta<DemoArgs>['component'],
  tags: ['autodocs'],
  parameters: {
    a11y: { test: 'error' },
    controls: { expanded: true },
    docs: {
      description: {
        component:
          "Streams the AI Overview that your Constructor search response promised: a short summary, then the products picked for the search. Pass the response's `agentic_promises`. Renders nothing when there's no AI Overview promise or the agent declines it. The default export. See the [Integration Guide](?path=/docs/agent-overview-integration-guide--docs).",
      },
    },
  },
  argTypes,
  render: (args) => <Demo {...args} />,
};

export default meta;

type Story = StoryObj<DemoArgs>;

export const Default: Story = { args: demoArgs };
