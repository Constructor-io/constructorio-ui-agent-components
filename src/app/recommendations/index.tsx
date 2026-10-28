import type { IAgentRecommendationsProps } from '@src/types';
import buildThemeStyles from '@src/utils/theme';
import { translateLabel } from '@src/utils/translate';

import ProductCarousel from '../components/ProductCarousel/ProductCarousel';
import Skeleton from '../components/Skeleton/Skeleton';
import useAgentRecommendations from '../hooks/useAgentRecommendations';

import '../../styles.css';
import './index.css';

/**
 * Pre-built recommendations pod for a product page: an AI-written title, a carousel of products
 * picked for the product being viewed, and refinement options that reload the pod for one interest.
 *
 * Renders nothing once a request settles without products, so whatever the page already had in
 * that slot shows through instead of an empty shell.
 *
 * @example
 * ```tsx
 * <CioAgentRecommendations
 *   apiKey="YOUR_API_KEY"
 *   itemId="119801"
 *   strategy="complementary_pod"
 * />
 * ```
 */
export default function CioAgentRecommendations(
  props: IAgentRecommendationsProps
) {
  const {
    title,
    products,
    refinementOptions,
    activeRefinement,
    refine,
    isLoading,
  } = useAgentRecommendations(props);
  const { callbacks, translations } = props;

  const isFirstLoad = isLoading && products.length === 0;
  if (!isFirstLoad && products.length === 0) return null;

  return (
    <div
      className="cio-agent-recommendations-root"
      style={buildThemeStyles(props.theme)}
    >
      {isFirstLoad ? (
        <Skeleton rows={1} cards={4} translations={translations} />
      ) : (
        <section className="cio-agent-recommendations" aria-busy={isLoading}>
          <h2 className="cio-agent-recommendations-title">{title}</h2>
          <ProductCarousel
            products={products}
            label={title}
            translations={translations}
            getProductUrl={callbacks?.getProductUrl}
            onProductClick={callbacks?.onProductClick}
          />
          {refinementOptions.length > 0 && (
            <div
              className="cio-agent-recommendations-refinement"
              role="group"
              aria-label={translateLabel(
                'CioAgentRecommendations.refinement.label',
                translations
              )}
            >
              {refinementOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="cio-agent-recommendations-option"
                  aria-pressed={option === activeRefinement}
                  disabled={isLoading}
                  onClick={() => {
                    callbacks?.onRefinementClick?.(option);
                    refine(option);
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
