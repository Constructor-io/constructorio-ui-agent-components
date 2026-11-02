import type { Product } from '@constructor-io/constructorio-ui-components';
import { ProductCard as CioProductCard } from '@constructor-io/constructorio-ui-components';

import type { IProduct } from '@src/types';

import './ProductCard.css';

interface IProductCardProps {
  /** Product data to render. */
  product: IProduct;
  /** Custom link URL. Falls back to the product's default URL if not provided. */
  href?: string;
  /** Click handler for the product card. */
  onClick?: (event: React.MouseEvent) => void;
}

/** Converts an IProduct to the format expected by the shared UI components library. */
export function toLibraryProduct(product: IProduct): Product {
  return {
    id: product.url,
    name: product.itemName,
    imageUrl: product.imageUrl,
    price: product.price.toFixed(2),
  };
}

export default function ProductCard({
  product,
  href,
  onClick,
}: IProductCardProps) {
  const libraryProduct = toLibraryProduct(product);
  const resolvedHref = href ?? product.url;

  return (
    <a
      className="cio-agent-overview-product-card"
      href={resolvedHref || undefined}
      onClick={onClick}
    >
      <CioProductCard product={libraryProduct}>
        <CioProductCard.ImageSection />
        <CioProductCard.Content>
          {product.label?.trim() && (
            <span className="cio-agent-overview-product-label">
              {product.label}
            </span>
          )}
          <CioProductCard.PriceSection />
          <CioProductCard.TitleSection />
        </CioProductCard.Content>
      </CioProductCard>
    </a>
  );
}
