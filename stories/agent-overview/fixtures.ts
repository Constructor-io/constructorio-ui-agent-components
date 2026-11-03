import type { ArgTypes } from '@storybook/react-vite';

import type { IAgenticPromise, IAgentOverviewProps } from '@src/types';

export const DEMO_API_KEY = 'key_x6UnCVRZaJgIHFQD';
/** The demo index answers this with one product from each of several categories. */
export const multiCategorySearch = 'I want to buy casual style';
/** The demo index answers this with one set of products. */
export const singleCategorySearch =
  'comfortable shirts for a summer beach wedding';

/** The stories' args: the component's props, plus the search the demo runs to get them. */
export type DemoArgs = IAgentOverviewProps & {
  /** The search the demo runs on the demo index, as a site's search page would. */
  search: string;
};

/**
 * Runs Constructor search on the demo index, as a site does on every search, and returns the
 * response's `agentic_promises`.
 */
export async function searchAgenticPromises(
  search: string,
  signal?: AbortSignal
): Promise<IAgenticPromise[]> {
  const params = new URLSearchParams({
    key: DEMO_API_KEY,
    c: 'cio-ui-agent-components-storybook',
    i: 'storybook-demo',
    s: '1',
    num_results_per_page: '1',
  });
  const response = await fetch(
    `https://ac.cnstrc.com/search/${encodeURIComponent(search)}?${params}`,
    { signal }
  );
  const json = (await response.json()) as {
    response?: { agentic_promises?: IAgenticPromise[] };
  };
  return json.response?.agentic_promises ?? [];
}

export const demoArgs: Pick<DemoArgs, 'search'> = {
  search: multiCategorySearch,
};

export const argTypes: Partial<ArgTypes<DemoArgs>> = {
  search: {
    control: 'text',
    description:
      'Not a prop: the search this demo runs on the demo index to get `agenticPromises`, as your search page does.',
    table: { category: 'Demo' },
  },
  agenticPromises: {
    control: false,
    description:
      '`response.agentic_promises` from your Constructor search response. See the [Integration Guide](?path=/docs/agent-overview-integration-guide--docs).',
  },
  theme: {
    description:
      'CSS custom property overrides. See [Customization](?path=/docs/agent-overview-customization--docs#theming).',
  },
  callbacks: {
    control: false,
    description: 'See [Callbacks](?path=/docs/agent-overview-callbacks--docs).',
  },
  translations: {
    description:
      'UI string overrides. See [Customization](?path=/docs/agent-overview-customization--docs#translations).',
  },
};
