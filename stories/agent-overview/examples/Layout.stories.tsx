import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';

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
  ), // The carousel clips its products at the edge of the copy, not inside the card's padding, so a
  // card scrolled almost out of view doesn't leave a faded sliver there.
  play: async ({ canvasElement }) => {
    const viewport = await waitFor(
      () => {
        const element = canvasElement.querySelector(
          '.cio-agent-overview-carousel-content'
        );
        if (!element) throw new Error('The products have not rendered yet');
        return element as HTMLElement;
      },
      { timeout: 60_000 }
    );
    const carousel = canvasElement.querySelector(
      '.cio-agent-overview-carousel'
    );
    const clipEdge = viewport.getBoundingClientRect().right;
    const contentEdge = (carousel as HTMLElement).getBoundingClientRect().right;
    await expect(Math.round(clipEdge)).toBe(Math.round(contentEdge));
  },
};

export const MultiCategory: Story = {};

export const SingleCategory: Story = {
  args: { search: singleCategorySearch },
};
