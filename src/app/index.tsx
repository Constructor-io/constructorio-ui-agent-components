import type { IAgentOverviewProps, IProduct } from '../types';
import buildThemeStyles from '../utils/theme';
import translate from '../utils/translate';

import CategorySection from './components/CategorySection/CategorySection';
import ErrorIconSVG from './components/icons/ErrorIconSVG';
import RecommendationSection from './components/RecommendationSection/RecommendationSection';
import Skeleton from './components/Skeleton/Skeleton';
import useAgentOverview from './hooks/useAgentOverview';

import '../styles.css';
import './index.css';

/**
 * Pre-built Agent Overview component that streams AI-generated category suggestions
 * and product recommendation sections in real time.
 *
 * @example
 * ```tsx
 * <CioAgentOverview
 *   apiKey="YOUR_API_KEY"
 *   intent="I want to buy shoes"
 *   domains={{ suggestions: 'searchbar', results: 'explorer' }}
 * />
 * ```
 */
export default function CioAgentOverview(props: IAgentOverviewProps) {
  const {
    phase,
    categories,
    categoryDescription,
    sections,
    selectCategory,
    isLoading,
    error,
  } = useAgentOverview(props);
  const { callbacks, translations } = props;

  const themeStyles = buildThemeStyles(props.theme);
  return (
    <div className="cio-agent-overview-root" style={themeStyles}>
      {isLoading && categories.length === 0 && sections.length === 0 && (
        <Skeleton
          rows={1}
          showTitle={false}
          cards={4}
          translations={translations}
        />
      )}
      {error && !isLoading && (
        <div className="cio-agent-overview-error">
          <div className="cio-agent-overview-error-icon" aria-hidden="true">
            <ErrorIconSVG />
          </div>
          <p className="cio-agent-overview-error-message" role="alert">
            {translate('CioAgentOverview.error.message', translations)}
          </p>
        </div>
      )}
      {phase === 'categories' && categories.length > 0 && (
        <CategorySection
          description={categoryDescription}
          categories={categories}
          translations={translations}
          onCategoryClick={(category) => {
            callbacks?.onCategoryClick?.(category);
            selectCategory(category);
          }}
          onViewSuggestions={() => {
            selectCategory(categories[0]);
          }}
        />
      )}
      {phase === 'products' && isLoading && (
        <Skeleton translations={translations} />
      )}
      {phase === 'products' &&
        !isLoading &&
        sections.map((section) => {
          const sectionWithUrl = callbacks?.getViewMoreUrl
            ? { ...section, viewMoreUrl: callbacks.getViewMoreUrl(section) }
            : section;

          return (
            <RecommendationSection
              key={section.title}
              section={sectionWithUrl}
              translations={translations}
              getProductUrl={callbacks?.getProductUrl}
              onProductClick={
                callbacks?.onProductClick
                  ? (event: React.MouseEvent, product: IProduct) =>
                      callbacks.onProductClick!(event, product, section)
                  : undefined
              }
            />
          );
        })}
    </div>
  );
}
