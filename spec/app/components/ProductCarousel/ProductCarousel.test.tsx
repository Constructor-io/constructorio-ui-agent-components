import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ProductCarousel from '@src/app/components/ProductCarousel/ProductCarousel';
import type { IProduct } from '@src/types';

const products: IProduct[] = [
  {
    itemName: 'Shoe A',
    imageUrl: 'https://example.com/a.jpg',
    price: 100,
    url: 'https://example.com/a',
  },
  {
    itemName: 'Shoe B',
    imageUrl: 'https://example.com/b.jpg',
    price: 120,
    url: 'https://example.com/b',
  },
];

describe('ProductCarousel', () => {
  it('renders all products', () => {
    render(<ProductCarousel products={products} />);
    expect(screen.getByText('Shoe A')).toBeTruthy();
    expect(screen.getByText('Shoe B')).toBeTruthy();
  });

  it('renders without crashing when products is empty', () => {
    expect(() => render(<ProductCarousel products={[]} />)).not.toThrow();
  });

  describe('accessibility', () => {
    it('names the carousel region by the label', () => {
      render(<ProductCarousel products={products} label="Running Shoes" />);
      expect(
        screen.getByRole('region', { name: 'Running Shoes' })
      ).toBeTruthy();
    });

    it('names the region with a translated default when no label is given', () => {
      render(<ProductCarousel products={products} />);
      expect(screen.getByRole('region', { name: 'Products' })).toBeTruthy();
    });

    it('treats a blank label as missing', () => {
      render(<ProductCarousel products={products} label="" />);
      expect(screen.getByRole('region', { name: 'Products' })).toBeTruthy();
    });

    it('names the arrows with translated labels', () => {
      render(
        <ProductCarousel
          products={products}
          translations={{
            'CioAgentOverview.carousel.previous': 'Go back',
            'CioAgentOverview.carousel.next': 'Go forward',
          }}
        />
      );
      expect(screen.getByRole('button', { name: 'Go back' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Go forward' })).toBeTruthy();
    });

    it('falls back to the default arrow labels when overrides are blank', () => {
      render(
        <ProductCarousel
          products={products}
          translations={{
            'CioAgentOverview.carousel.previous': '',
            'CioAgentOverview.carousel.next': '',
          }}
        />
      );
      expect(
        screen.getByRole('button', { name: 'Show previous items' })
      ).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Show next items' })
      ).toBeTruthy();
    });

    it('falls back to the default region label when label is blank', () => {
      render(<ProductCarousel products={products} label="  " />);
      expect(screen.getByRole('region', { name: 'Products' })).toBeTruthy();
    });

    it('uses the default arrow labels', () => {
      render(<ProductCarousel products={products} />);
      expect(
        screen.getByRole('button', { name: 'Show previous items' })
      ).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Show next items' })
      ).toBeTruthy();
    });
  });

  it('calls onProductClick with event, product and position when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <ProductCarousel products={products} onProductClick={handleClick} />
    );
    const links = screen.getAllByRole('link');
    await user.click(links[0]);
    expect(handleClick).toHaveBeenCalledExactlyOnceWith(
      expect.anything(),
      products[0],
      0
    );
  });

  it('uses getProductUrl to set product card href', () => {
    const getProductUrl = (product: IProduct) =>
      `/products/${product.itemName}`;
    render(
      <ProductCarousel products={products} getProductUrl={getProductUrl} />
    );
    const links = screen.getAllByRole('link');
    expect(links[0].getAttribute('href')).toBe('/products/Shoe A');
    expect(links[1].getAttribute('href')).toBe('/products/Shoe B');
  });

  it('falls back to product.url when getProductUrl is not provided', () => {
    render(<ProductCarousel products={products} />);
    const links = screen.getAllByRole('link');
    expect(links[0].getAttribute('href')).toBe('https://example.com/a');
    expect(links[1].getAttribute('href')).toBe('https://example.com/b');
  });
});
