import type ConstructorIOClient from '@constructor-io/constructorio-client-javascript';

/** Theme customization for the Agent Overview component. All properties map to CSS custom properties. */
export interface CioAgentOverviewTheme {
  /** Font family for all text in the component. Maps to `--cio-font-family`. */
  fontFamily?: React.CSSProperties['fontFamily'];
  /** Extra-small font size (e.g. badges). Maps to `--cio-font-size-xs`. */
  fontSizeXs?: React.CSSProperties['fontSize'];
  /** Small font size (e.g. prices). Maps to `--cio-font-size-sm`. */
  fontSizeSm?: React.CSSProperties['fontSize'];
  /** Base font size. Maps to `--cio-font-size-base`. */
  fontSizeBase?: React.CSSProperties['fontSize'];
  /** Large font size (e.g. section titles). Maps to `--cio-font-size-lg`. */
  fontSizeLg?: React.CSSProperties['fontSize'];
  /** Line height for text. Maps to `--cio-line-height`. */
  lineHeight?: React.CSSProperties['lineHeight'];
  /** Normal font weight. Maps to `--cio-font-weight-normal`. */
  fontWeightNormal?: React.CSSProperties['fontWeight'];
  /** Medium font weight. Maps to `--cio-font-weight-medium`. */
  fontWeightMedium?: React.CSSProperties['fontWeight'];
  /** Semibold font weight. Maps to `--cio-font-weight-semibold`. */
  fontWeightSemibold?: React.CSSProperties['fontWeight'];
  /** Bold font weight. Maps to `--cio-font-weight-bold`. */
  fontWeightBold?: React.CSSProperties['fontWeight'];

  /** Primary text color. Maps to `--cio-color-primary`. */
  primaryColor?: React.CSSProperties['color'];
  /** Secondary text color. Maps to `--cio-color-secondary`. */
  secondaryColor?: React.CSSProperties['color'];
  /** Muted text color (e.g. descriptions). Maps to `--cio-color-muted`. */
  mutedColor?: React.CSSProperties['color'];
  /** Subtle color for light accents. Maps to `--cio-color-subtle`. */
  subtleColor?: React.CSSProperties['color'];
  /** Product name text color. Maps to `--cio-color-product-name`. */
  productNameColor?: React.CSSProperties['color'];
  /** Border color for cards and sections. Maps to `--cio-color-border`. */
  borderColor?: React.CSSProperties['color'];
  /** Background color of the root container. Maps to `--cio-color-background`. */
  background?: React.CSSProperties['backgroundColor'];
  /** Muted background color for sections. Maps to `--cio-color-background-muted`. */
  backgroundMuted?: React.CSSProperties['backgroundColor'];
  /** Accent color on hover states. Maps to `--cio-color-hover-accent`. */
  hoverAccentColor?: React.CSSProperties['color'];

  /** Size of carousel navigation arrows. Maps to `--cio-arrow-size`. */
  arrowSize?: React.CSSProperties['width'];
  /** Border radius of carousel arrows. Maps to `--cio-arrow-border-radius`. */
  arrowBorderRadius?: React.CSSProperties['borderRadius'];
  /** Border color of carousel arrows. Maps to `--cio-arrow-border-color`. */
  arrowBorderColor?: React.CSSProperties['color'];
  /** Border color of carousel arrows on hover. Maps to `--cio-arrow-border-color-hover`. */
  arrowBorderColorHover?: React.CSSProperties['color'];
  /** Icon color of carousel arrows. Maps to `--cio-arrow-color`. */
  arrowColor?: React.CSSProperties['color'];
  /** Box shadow of carousel arrows. Maps to `--cio-arrow-shadow`. */
  arrowShadow?: React.CSSProperties['boxShadow'];
  /** Box shadow of carousel arrows on hover. Maps to `--cio-arrow-shadow-hover`. */
  arrowShadowHover?: React.CSSProperties['boxShadow'];

  /** Extra-small spacing unit. Maps to `--cio-spacing-xs`. */
  spacingXs?: React.CSSProperties['gap'];
  /** Small spacing unit. Maps to `--cio-spacing-sm`. */
  spacingSm?: React.CSSProperties['gap'];
  /** Medium spacing unit. Maps to `--cio-spacing-md`. */
  spacingMd?: React.CSSProperties['gap'];
  /** Large spacing unit. Maps to `--cio-spacing-lg`. */
  spacingLg?: React.CSSProperties['gap'];
  /** Extra-large spacing unit. Maps to `--cio-spacing-xl`. */
  spacingXl?: React.CSSProperties['gap'];
  /** Double extra-large spacing unit. Maps to `--cio-spacing-2xl`. */
  spacing2xl?: React.CSSProperties['gap'];
}

/** Callback functions for handling user interactions within the Agent Overview component. */
export interface IAgentOverviewCallbacks {
  /** Called when a user clicks on a product card within a recommendation section. */
  onProductClick?: (
    event: React.MouseEvent,
    product: IProduct,
    section: IRecommendationSection
  ) => void;
  /** Called when a user clicks on a category card. */
  onCategoryClick?: (category: ICategory) => void;
  /** Builds a URL for a product card link. If not provided, the product's default URL is used. */
  getProductUrl?: (product: IProduct) => string;
  /** Builds a "View more" URL from section data (e.g. group title). If not provided, the link is hidden. */
  getViewMoreUrl?: (section: IRecommendationSection) => string;
}

/**
 * Translations type for internationalizing UI strings.
 * All keys are optional — any non-provided translation will fall back to the English default.
 */
export type Translations = {
  'CioAgentOverview.section.aiBadge'?: string;
  'CioAgentOverview.categories.viewSuggestions'?: string;
  'CioAgentOverview.section.viewMore'?: string;
  'CioAgentOverview.skeleton.thinking'?: string;
  'CioAgentOverview.carousel.previous'?: string;
  'CioAgentOverview.carousel.next'?: string;
  'CioAgentOverview.carousel.label'?: string;
  'CioAgentOverview.categories.carouselLabel'?: string;
  'CioAgentOverview.error.message'?: string;
  'CioAgentRecommendations.fallbackTitle'?: string;
  'CioAgentRecommendations.refinement.label'?: string;
};

/** Agent stream domain identifiers for fetching category suggestions and product results. */
export interface IAgentOverviewDomains {
  /** Domain used to fetch category suggestions. */
  suggestions: string;
  /** Domain used to fetch product results. */
  results: string;
}

/** Props for the CioAgentOverview component and useAgentOverview hook. */
export interface IAgentOverviewProps {
  /** Constructor.io API key. Required if `cioJsClient` is not provided. */
  apiKey?: string;
  /** Pre-configured Constructor.io JS client instance. Takes precedence over `apiKey`. */
  cioJsClient?: ConstructorIOClient;
  /** The user's search intent that drives agent recommendations. */
  intent: string;
  /** Domain identifiers for the agent stream endpoints. */
  domains: IAgentOverviewDomains;
  /** Theme overrides for customizing visual appearance via CSS custom properties. */
  theme?: CioAgentOverviewTheme;
  /** Callback functions for handling user interactions. */
  callbacks?: IAgentOverviewCallbacks;
  /** Translation overrides for internationalizing UI strings. */
  translations?: Translations;
}

/** A category suggestion returned by the agent stream. */
export interface ICategory {
  title: string;
  imageUrl: string;
}

/** A product item within a recommendation section. */
export interface IProduct {
  itemName: string;
  imageUrl: string;
  price: number;
  url: string;
}

/** A group of recommended products with a title and description. */
export interface IRecommendationSection {
  title: string;
  description: string;
  products: IProduct[];
  /** URL for the "View more" link. Populated via the `getViewMoreUrl` callback. */
  viewMoreUrl?: string;
}

/** Callback functions for handling user interactions within the Agent Recommendations component. */
export interface IAgentRecommendationsCallbacks {
  /** Called when a user clicks on a product card in the pod. */
  onProductClick?: (event: React.MouseEvent, product: IProduct) => void;
  /** Called when a user clicks on a refinement option, before the pod reloads for it. */
  onRefinementClick?: (option: string) => void;
  /** Builds a URL for a product card link. If not provided, the product's default URL is used. */
  getProductUrl?: (product: IProduct) => string;
}

/** Props for the CioAgentRecommendations component and useAgentRecommendations hook. */
export interface IAgentRecommendationsProps {
  /** Constructor.io API key. Required if `cioJsClient` is not provided. */
  apiKey?: string;
  /** Pre-configured Constructor.io JS client instance. Takes precedence over `apiKey`. */
  cioJsClient?: ConstructorIOClient;
  /** The id of the product on the page. The pod recommends relative to it. */
  itemId: string;
  /** The selected variation of that product, such as a color or size. */
  variationId?: string;
  /**
   * The recommendations pod to run, such as `complementary_pod` or `alternatives_pod`. The accepted
   * values are configured per index key by Constructor.
   */
  strategy: string;
  /** Title to show when the agent returns its default, non-personalized set. */
  defaultTitle?: string;
  /** Theme overrides for customizing visual appearance via CSS custom properties. */
  theme?: CioAgentOverviewTheme;
  /** Callback functions for handling user interactions. */
  callbacks?: IAgentRecommendationsCallbacks;
  /** Translation overrides for internationalizing UI strings. */
  translations?: Translations;
}
