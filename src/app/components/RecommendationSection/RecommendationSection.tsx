import type {
  IProduct,
  IRecommendationSection,
  Translations,
} from '@src/types';
import translate from '@src/utils/translate';

import ChevronRightSVG from '../icons/ChevronRightSVG';
import SparkleSVG from '../icons/SparkleSVG';
import ProductCarousel from '../ProductCarousel/ProductCarousel';

import './RecommendationSection.css';

interface IRecommendationSectionProps {
  /** The section data containing title, description, products, and optional viewMoreUrl. */
  section: IRecommendationSection;
  /** Translation overrides for UI strings. */
  translations?: Translations;
  /** Builds a custom URL for each product card link. */
  getProductUrl?: (product: IProduct) => string;
  /** Called when a product card within this section is clicked. */
  onProductClick?: (event: React.MouseEvent, product: IProduct) => void;
}

/** Renders a single recommendation section with AI badge, title, description, and product carousel. */
export default function RecommendationSection({
  section,
  translations,
  getProductUrl,
  onProductClick,
}: IRecommendationSectionProps) {
  return (
    <div className="cio-agent-overview-section">
      <div className="cio-agent-overview-section-badge">
        <SparkleSVG />
        <span>
          {translate('CioAgentOverview.section.aiBadge', translations)}
        </span>
      </div>
      <div className="cio-agent-overview-section-header">
        <div className="cio-agent-overview-section-header-text">
          <h2 className="cio-agent-overview-section-title">{section.title}</h2>
          <p className="cio-agent-overview-section-description">
            {section.description}
          </p>
        </div>
        {section.viewMoreUrl && (
          <a
            className="cio-agent-overview-section-view-more"
            href={section.viewMoreUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {translate('CioAgentOverview.section.viewMore', translations)}
            <ChevronRightSVG />
          </a>
        )}
      </div>
      <ProductCarousel
        products={section.products}
        label={section.title}
        translations={translations}
        getProductUrl={getProductUrl}
        onProductClick={
          onProductClick && ((event, product) => onProductClick(event, product))
        }
      />
    </div>
  );
}
