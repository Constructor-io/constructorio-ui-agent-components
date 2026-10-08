import type { Meta, StoryObj } from '@storybook/react-vite';

import { demoArgs } from '../fixtures';

import HeadlessTemplate from './HeadlessTemplate';

const meta: Meta<typeof HeadlessTemplate> = {
  title: 'Examples/Headless',
  component: HeadlessTemplate,
  tags: ['!dev'],
  parameters: { a11y: { test: 'error' } },
  args: demoArgs,
};

export default meta;

type Story = StoryObj<typeof HeadlessTemplate>;

export const Default: Story = {};
