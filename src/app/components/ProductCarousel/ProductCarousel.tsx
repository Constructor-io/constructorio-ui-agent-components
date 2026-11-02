import { Carousel } from '@constructor-io/constructorio-ui-components';

import type { IProduct, Translations } from '@src/types';
import { translateLabel } from '@src/utils/translate';

import ProductCard, { toLibraryProduct } from '../ProductCard/ProductCard';

import './ProductCarousel.css';

interface IProductCarouselProps {
  /** Array of products to display in the carousel. */
  products: IProduct[];
  /** Accessible name of the carousel region. Defaults to a translated generic label. */
  label?: string;
  /** Translation overrides for UI strings. */
  translations?: Translations;
  /** Builds a custom URL for each product card link. */
  getProductUrl?: (product: IProduct) => string;
  /** Called when a product card is clicked. */
  onProductClick?: (event: React.MouseEvent, product: IProduct) => void;
}

/** Horizontal carousel of product cards with navigation arrows. */
export default function ProductCarousel({
  products,
  label,
  translations,
  getProductUrl,
  onProductClick,
}: IProductCarouselProps) {
  const libraryProducts = products.map(toLibraryProduct);

  return (
    <div className="cio-agent-overview-carousel">
      <Carousel
        items={libraryProducts}
        loop={false}
        className="cio-agent-overview-carousel-inner"
        aria-label={
          label?.trim() ||
          translateLabel('CioAgentOverview.carousel.label', translations)
        }
      >
        {({ items }) => (
          <>
            <Carousel.Previous
              aria-label={translateLabel(
                'CioAgentOverview.carousel.previous',
                translations
              )}
            />
            <Carousel.Content className="cio-agent-overview-carousel-content">
              {items?.map((item, index) => {
                const product = products[index];
                return (
                  // Two products can share a URL (the id), so the position keeps keys unique.
                  <Carousel.Item
                    key={`${index}-${item.id}`}
                    item={item}
                    index={index}
                  >
                    <ProductCard
                      product={product}
                      href={getProductUrl?.(product)}
                      onClick={
                        onProductClick
                          ? (e: React.MouseEvent) => onProductClick(e, product)
                          : undefined
                      }
                    />
                  </Carousel.Item>
                );
              })}
            </Carousel.Content>
            <Carousel.Next
              aria-label={translateLabel(
                'CioAgentOverview.carousel.next',
                translations
              )}
            />
          </>
        )}
      </Carousel>
    </div>
  );
}
