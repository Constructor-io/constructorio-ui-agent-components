import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import CioAgentRecommendations from '@src/app/recommendations';
import { fetchRecommendations } from '@src/app/services/agentRecommendationsClient';

vi.mock('@src/app/services/agentRecommendationsClient', () => ({
  fetchRecommendations: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchRecommendations);

const pod = {
  title: 'Everyday Carry',
  products: [
    {
      itemName: 'Card Holder',
      imageUrl: 'https://example.com/a.jpg',
      price: 15,
      url: 'https://example.com/a',
    },
  ],
  refinementOptions: ['Slim cardholders', 'Commuter bags'],
  threadId: 'thread-1',
  status: 'complete',
};

const props = {
  apiKey: 'key_test',
  itemId: '119801',
  strategy: 'complementary_pod',
};

describe('CioAgentRecommendations', () => {
  afterEach(() => {
    mockedFetch.mockReset();
  });

  it('should show a skeleton, then the title, products and options', async () => {
    mockedFetch.mockResolvedValue(pod);
    render(<CioAgentRecommendations {...props} />);

    expect(screen.getByText('Thinking')).toBeInTheDocument();

    expect(
      await screen.findByRole('heading', { name: 'Everyday Carry' })
    ).toBeInTheDocument();
    expect(screen.getByText('Card Holder')).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: "Not what you're looking for? Try:" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Slim cardholders' })
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('should reload for a clicked option and mark it pressed', async () => {
    mockedFetch.mockResolvedValueOnce(pod);
    const onRefinementClick = vi.fn();
    render(
      <CioAgentRecommendations {...props} callbacks={{ onRefinementClick }} />
    );
    await screen.findByRole('heading', { name: 'Everyday Carry' });

    mockedFetch.mockResolvedValueOnce({ ...pod, title: 'Slim Card Carry' });
    fireEvent.click(screen.getByRole('button', { name: 'Slim cardholders' }));

    expect(onRefinementClick).toHaveBeenCalledWith('Slim cardholders');
    expect(
      await screen.findByRole('heading', { name: 'Slim Card Carry' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Slim cardholders' })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(mockedFetch).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        shopperInput: 'Slim cardholders',
        threadId: 'thread-1',
      }),
      expect.any(AbortSignal)
    );
  });

  it('should render nothing when the pod has no products', async () => {
    mockedFetch.mockResolvedValue({ ...pod, products: [] });
    const { container } = render(<CioAgentRecommendations {...props} />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('should render nothing when the request fails', async () => {
    mockedFetch.mockRejectedValue(new Error('status 400'));
    const { container } = render(<CioAgentRecommendations {...props} />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
