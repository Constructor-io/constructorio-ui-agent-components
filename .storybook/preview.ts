import type { Preview } from '@storybook/react-vite';

import './storybook-styles.css';

const preview: Preview = {
  parameters: {
    options: {
      storySort: {
        order: [
          'Introduction',
          'Guides',
          ['Integration Guide', 'Callbacks', 'Customization', 'Custom UI', 'FAQ'],
          'Components & Utilities',
          [
            'CioAgentOverview',
            'useAgentOverview',
            'Section Components',
            'JavaScript Bundle',
          ],
        ],
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
      options: {
        runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
        rules: {
          // Colors come from the design system and are not checked here
          'color-contrast': { enabled: false },
          'target-size': { enabled: true },
          'aria-dialog-name': { enabled: true },
          'aria-allowed-role': { enabled: true },
          'presentation-role-conflict': { enabled: true },
          'focus-order-semantics': { enabled: true },
          tabindex: { enabled: true },
        },
      },
    },
  },
};

export default preview;
