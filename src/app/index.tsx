import type {
  IAgentOverviewProps,
  IAgentOverviewSection,
  IProduct,
} from '../types';
import buildThemeStyles from '../utils/theme';
import translate, { translateLabel } from '../utils/translate';

import ProductCarousel from './components/ProductCarousel/ProductCarousel';
import Skeleton from './components/Skeleton/Skeleton';
import useAgentOverview from './hooks/useAgentOverview';

import '../styles.css';
// The section and title styles the overview shares with RecommendationSection.
import './components/RecommendationSection/RecommendationSection.css';
import './index.css';

/**
 * Pre-built AI Overview: streams a short AI-written summary and the products picked for a
 * shopper's search, for the top of a search results page. A query that gets no overview, or a
 * failed request, renders nothing.
 *
 * @example
 * ```tsx
 * <CioAgentOverview apiKey="YOUR_API_KEY" query="gift for my dad who loves grilling" />
 * ```
 */
export default function CioAgentOverview(props: IAgentOverviewProps) {
  const { status, message, sections } = useAgentOverview(props);
  const { callbacks, translations } = props;

  const paragraphs = message.split('\n\n').filter((text) => text.trim());
  const products = sections.flatMap((section) => section.products);
  const sectionOf = new Map<IProduct, IAgentOverviewSection>(
    sections.flatMap((section) =>
      section.products.map((product) => [product, section] as const)
    )
  );
  const hasContent = paragraphs.length > 0 || products.length > 0;
  const isOpen =
    status === 'loading' || status === 'streaming' || status === 'done';
  // A first set of several products is a single-category overview: its title heads the row.
  // Sets of one product are categories of a multi-category overview, labelled on each card.
  // Blanking a string is how a site hides it.
  const badge = translate('CioAgentOverview.badge', translations);
  const heading =
    sections[0] && sections[0].products.length > 1 ? sections[0].title : '';

  return (
    <div
      className="cio-agent-overview-root"
      style={buildThemeStyles(props.theme)}
    >
      {isOpen && (
        <div
          className="cio-agent-overview-section cio-agent-overview-card"
          aria-busy={status !== 'done'}
        >
          {badge && <span className="cio-agent-overview-badge">{badge}</span>}
          {!hasContent && (
            <Skeleton
              rows={1}
              showTitle={false}
              cards={4}
              translations={translations}
            />
          )}
          {paragraphs.map((text, index) => (
            // Paragraphs only ever append, so the index is a stable key.
            <p key={index} className="cio-agent-overview-message">
              {text}
            </p>
          ))}
          {heading && (
            <h2 className="cio-agent-overview-section-title cio-agent-overview-title">
              {heading}
            </h2>
          )}
          {products.length > 0 && (
            <ProductCarousel
              products={products}
              label={translateLabel(
                'CioAgentOverview.carousel.label',
                translations
              )}
              translations={translations}
              getProductUrl={callbacks?.getProductUrl}
              onProductClick={
                callbacks?.onProductClick
                  ? (event, product) => {
                      const section = sectionOf.get(product);
                      if (section) {
                        callbacks.onProductClick!(event, product, section);
                      }
                    }
                  : undefined
              }
            />
          )}
          {hasContent && products.length === 0 && (
            <div
              className="cio-agent-overview-skeleton-products"
              aria-hidden="true"
            >
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="cio-agent-overview-skeleton-product">
                  <div className="cio-agent-overview-skeleton-bone cio-agent-overview-skeleton-product-image" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
