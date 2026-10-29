import type { RenderPropsChildren } from '@constructor-io/constructorio-ui-components';
import { RenderPropsWrapper } from '@constructor-io/constructorio-ui-components';

import type {
  IAgentRecommendationsProductCardRenderProps,
  IAgentRecommendationsProps,
  IProduct,
} from '@src/types';
import buildThemeStyles from '@src/utils/theme';
import { translateLabel } from '@src/utils/translate';

import ProductCarousel from '../components/ProductCarousel/ProductCarousel';
import Skeleton from '../components/Skeleton/Skeleton';
import useAgentRecommendations from '../hooks/useAgentRecommendations';

import '../../styles.css';
import './index.css';

/** Gives a `productCard` override function the card's click tracking. A node override has no click to track. */
function withTrackClick(
  override:
    | RenderPropsChildren<IAgentRecommendationsProductCardRenderProps>
    | undefined,
  trackProductClick: (product: IProduct, index: number) => void
): RenderPropsChildren<{ product: IProduct; index: number }> | undefined {
  if (typeof override !== 'function') return override;
  return ({ product, index }) =>
    override({
      product,
      index,
      trackClick: () => trackProductClick(product, index),
    });
}

/**
 * Pre-built recommendations pod for a product page: an AI-written title, a carousel of products
 * picked for the product being viewed, and refinement options that reload the pod for one interest.
 *
 * Renders nothing once a request settles without products, so whatever the page already had in
 * that slot shows through instead of an empty shell. A root override (`children` or
 * `componentOverrides.reactNode`) is still rendered then, with `error` in its props.
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
  const { containerRef, ...pod } = useAgentRecommendations(props);
  const {
    title,
    products,
    refinementOptions,
    activeRefinement,
    isLoading,
    refine,
    trackProductClick,
  } = pod;
  const { callbacks, translations, componentOverrides, children } = props;
  const rootOverride = children ?? componentOverrides?.reactNode;

  const productCardOverride = withTrackClick(
    componentOverrides?.productCard?.reactNode,
    trackProductClick
  );

  // A control-group shopper gets no pod, only a node the view event can be tied to, so both arms of
  // an A/B test are measured the same way. Kept out of the layout, and out of assistive technology.
  if (props.abTest?.isControl) {
    return (
      <div
        ref={containerRef}
        className="cio-agent-recommendations-control-placeholder"
        data-testid="cio-agent-recommendations-control-placeholder"
        style={{
          width: 1,
          height: 1,
          padding: 0,
          border: 0,
          margin: 0,
          overflow: 'hidden',
        }}
        aria-hidden="true"
      />
    );
  }

  const isFirstLoad = isLoading && products.length === 0;
  if (!isFirstLoad && products.length === 0 && !rootOverride) return null;

  return (
    <div
      ref={containerRef}
      className="cio-agent-recommendations-root"
      style={buildThemeStyles(props.theme)}
    >
      <RenderPropsWrapper props={pod} override={rootOverride}>
        {isFirstLoad ? (
          <RenderPropsWrapper
            props={{}}
            override={componentOverrides?.loading?.reactNode}
          >
            <Skeleton rows={1} cards={4} translations={translations} />
          </RenderPropsWrapper>
        ) : (
          <section className="cio-agent-recommendations" aria-busy={isLoading}>
            <RenderPropsWrapper
              props={{ title, isLoading }}
              override={componentOverrides?.title?.reactNode}
            >
              <h2 className="cio-agent-recommendations-title">{title}</h2>
            </RenderPropsWrapper>
            <ProductCarousel
              products={products}
              label={title}
              translations={translations}
              getProductUrl={callbacks?.getProductUrl}
              onProductClick={(event, product, index) => {
                trackProductClick(product, index);
                callbacks?.onProductClick?.(event, product);
              }}
              productCardOverride={productCardOverride}
            />
            {refinementOptions.length > 0 && (
              <RenderPropsWrapper
                props={{
                  options: refinementOptions,
                  activeRefinement,
                  refine,
                  isLoading,
                }}
                override={componentOverrides?.refinement?.reactNode}
              >
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
                      onClick={() => refine(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </RenderPropsWrapper>
            )}
          </section>
        )}
      </RenderPropsWrapper>
    </div>
  );
}
