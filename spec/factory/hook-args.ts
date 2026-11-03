import { Factory } from 'fishery';

import type { IAgenticPromise, IAgentOverviewProps } from '../../src/types';

/** An AI Overview promise as a Constructor search response carries it. */
export function aiOverviewPromise(
  shopperInput = 'I want to buy casual style',
  parentResultId = 'p1'
): IAgenticPromise {
  return {
    pod: { id: 'search_ai_overview', display_name: 'AI Overview' },
    mode: 'search',
    method: 'POST',
    callback_url: `https://agent.cnstrc.com/v1/agent_insights/search?key=k&i=c1&s=1&c=host&parent_result_id=${parentResultId}`,
    body: {
      shopper_input: shopperInput,
      page_context: { page_type: 'plp', search_term: shopperInput },
    },
  };
}

export const agentOverviewProps = Factory.define<IAgentOverviewProps>(() => ({
  agenticPromises: [aiOverviewPromise()],
}));
