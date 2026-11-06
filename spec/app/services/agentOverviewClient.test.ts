import { aiOverviewPromise } from '@spec/factory';

import { streamAgentInsights } from '@src/app/services/agentInsightsClient';
import {
  AI_OVERVIEW_POD_ID,
  findAiOverviewPromise,
  streamAgentOverview,
} from '@src/app/services/agentOverviewClient';

vi.mock('@src/app/services/agentInsightsClient', () => ({
  streamAgentInsights: vi.fn(),
}));

const mockedStream = vi.mocked(streamAgentInsights);

describe('agentOverviewClient', () => {
  afterEach(() => {
    mockedStream.mockReset();
  });

  describe('findAiOverviewPromise', () => {
    it('should find the promise by its pod id, not its position', () => {
      const overview = aiOverviewPromise();
      const other = {
        ...aiOverviewPromise(),
        pod: { id: 'search_something_else' },
      };
      expect(findAiOverviewPromise([other, overview])).toBe(overview);
      expect(AI_OVERVIEW_POD_ID).toBe('search_ai_overview');
    });

    it.each([
      ['no array', undefined],
      ['null', null],
      ['an empty array', []],
      ['another pod only', [{ pod: { id: 'other' }, callback_url: 'u' }]],
      [
        'a promise without a callback_url',
        [{ pod: { id: AI_OVERVIEW_POD_ID } }],
      ],
      ['entries that are not objects', [null, 'x', 1]],
    ])('should return null for %s', (_, promises) => {
      expect(findAiOverviewPromise(promises)).toBeNull();
    });
  });

  describe('streamAgentOverview', () => {
    it('should send the promise as it is', () => {
      const promise = aiOverviewPromise();
      const signal = new AbortController().signal;
      streamAgentOverview(promise, signal);
      expect(mockedStream).toHaveBeenCalledWith(promise, { signal });
    });
  });
});
