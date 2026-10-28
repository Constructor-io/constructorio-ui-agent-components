import type { RenderPropsChildren } from '@constructor-io/constructorio-ui-components';
import {
  Carousel,
  RenderPropsWrapper,
} from '@constructor-io/constructorio-ui-components';

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
  /** Called when a product card is clicked, with the card's position in the carousel. */
  onProductClick?: (
    event: React.MouseEvent,
    product: IProduct,
    index: number
  ) => void;
  /** Renders each card in place of the default ProductCard. */
  productCardOverride?: RenderPropsChildren<{
    product: IProduct;
    index: number;
  }>;
}

/** Horizontal carousel of product cards with navigation arrows. */
export default function ProductCarousel({
  products,
  label,
  translations,
  getProductUrl,
  onProductClick,
  productCardOverride,
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
                  <Carousel.Item key={item.id} item={item} index={index}>
                    <RenderPropsWrapper
                      props={{ product, index }}
                      override={productCardOverride}
                    >
                      <ProductCard
                        product={product}
                        href={getProductUrl?.(product)}
                        onClick={
                          onProductClick
                            ? (e: React.MouseEvent) =>
                                onProductClick(e, product, index)
                            : undefined
                        }
                      />
                    </RenderPropsWrapper>
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
