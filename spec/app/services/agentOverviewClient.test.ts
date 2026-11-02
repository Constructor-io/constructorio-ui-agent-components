import ConstructorIOClient from '@constructor-io/constructorio-client-javascript';

import { streamAgentInsights } from '@src/app/services/agentInsightsClient';
import {
  AGENT_OVERVIEW_CLIENT_TAG,
  createAgentOverviewClient,
  streamAgentOverview,
} from '@src/app/services/agentOverviewClient';

vi.mock('@constructor-io/constructorio-client-javascript', () => ({
  default: vi.fn(),
}));
vi.mock('@src/app/services/agentInsightsClient', () => ({
  streamAgentInsights: vi.fn(),
}));

const MockedClient = vi.mocked(ConstructorIOClient);
const mockedStream = vi.mocked(streamAgentInsights);
const hostClient = { options: { apiKey: 'k', version: 'host' } } as never;

describe('agentOverviewClient', () => {
  afterEach(() => {
    MockedClient.mockReset();
    mockedStream.mockReset();
  });

  describe('createAgentOverviewClient', () => {
    it('should throw without apiKey or cioJsClient', () => {
      expect(() => createAgentOverviewClient({})).toThrow(
        'Either apiKey or cioJsClient must be provided'
      );
    });

    it('should use the host client when given', () => {
      expect(
        createAgentOverviewClient({ apiKey: 'other', cioJsClient: hostClient })
      ).toBe(hostClient);
      expect(MockedClient).not.toHaveBeenCalled();
    });

    it('should create a tracking-enabled client from apiKey', () => {
      createAgentOverviewClient({ apiKey: 'k' });
      expect(MockedClient).toHaveBeenCalledWith({
        apiKey: 'k',
        sendTrackingEvents: true,
        version: AGENT_OVERVIEW_CLIENT_TAG,
      });
    });
  });

  describe('streamAgentOverview', () => {
    it('should send shopper_input and a plp page_context with the query as search_term', () => {
      const signal = new AbortController().signal;
      streamAgentOverview(hostClient, { query: 'gift for dad' }, signal);

      expect(mockedStream).toHaveBeenCalledWith(
        hostClient,
        'search',
        {
          shopper_input: 'gift for dad',
          page_context: { page_type: 'plp', search_term: 'gift for dad' },
        },
        { clientTag: AGENT_OVERVIEW_CLIENT_TAG, signal }
      );
    });

    it('should use pageContext when given', () => {
      streamAgentOverview(hostClient, {
        query: 'gift for dad',
        pageContext: { pageType: 'collection', searchTerm: 'gifts' },
      });

      expect(mockedStream.mock.calls[0][2]).toEqual({
        shopper_input: 'gift for dad',
        page_context: { page_type: 'collection', search_term: 'gifts' },
      });
    });

    it('should tag the request with the overview tag even on a host client', () => {
      streamAgentOverview(hostClient, { query: 'q' });
      expect(mockedStream.mock.calls[0][3]).toMatchObject({
        clientTag: AGENT_OVERVIEW_CLIENT_TAG,
      });
      expect(AGENT_OVERVIEW_CLIENT_TAG).toMatch(/^cio-ui-agent-overview-/);
    });
  });
});
