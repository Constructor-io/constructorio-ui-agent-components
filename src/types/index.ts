// cspell:ignore cnstrc -- Constructor's page global, window.cnstrc
import type ConstructorIOClient from '@constructor-io/constructorio-client-javascript';
import type { RenderPropsChildren } from '@constructor-io/constructorio-ui-components';

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
  /** The product's catalog id, when the response carries one. Sent with click tracking. */
  itemId?: string;
  /** The variation's catalog id, when the response carries one. Sent with click tracking. */
  variationId?: string;
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

/** Overrides one part: a node rendered in its place, or a function that renders it from the part's props. */
export interface IComponentOverride<RenderProps> {
  reactNode?: RenderPropsChildren<RenderProps>;
}

/** The pod's state, returned by useAgentRecommendations and passed to a root override. */
export interface IAgentRecommendationsRenderProps {
  /** The pod title for the response on screen. Empty until the first response settles. */
  title: string;
  products: IProduct[];
  /** Labels to offer as refinements. */
  refinementOptions: string[];
  /** The option behind the products on screen, or `null` before any refinement. */
  activeRefinement: string | null;
  /** Reloads the pod for one of `refinementOptions`, on the same thread. */
  refine: (option: string) => void;
  /** While the first load or a refinement is in flight. */
  isLoading: boolean;
  /** Why the last request failed. Products from an earlier response stay. */
  error: string | null;
  /** The `result_id` of the response on screen, or `null` before one settles. */
  resultId: string | null;
  /** The pod's conversation thread, or `null` before the first response settles. */
  threadId: string | null;
}

/** Root override props: the pod's state, plus the tracking an override must report itself. */
export interface IAgentRecommendationsRootRenderProps extends IAgentRecommendationsRenderProps {
  /** Reports a product click to Constructor. Call it from your own card's click handler. */
  trackProductClick: (product: IProduct, index: number) => void;
}

/** What useAgentRecommendations returns: everything a root override receives, plus the view tracking. */
export interface IAgentRecommendationsHookReturn extends IAgentRecommendationsRootRenderProps {
  /**
   * Attach to the pod's outermost element. It sends the view, out-of-view and time-in-view events;
   * without it, only the response and click events are sent.
   */
  containerRef: (node: HTMLElement | null) => void;
}

/** Props passed to a `componentOverrides.productCard` override. */
export interface IAgentRecommendationsProductCardRenderProps {
  product: IProduct;
  index: number;
  /** Reports this product's click to Constructor. Call it from your card's click handler. */
  trackClick: () => void;
}

/** Props passed to a `componentOverrides.refinement` override. */
export interface IAgentRecommendationsRefinementRenderProps {
  options: string[];
  activeRefinement: string | null;
  /** Tracks the click, calls `callbacks.onRefinementClick`, then reloads the pod for the option. */
  refine: (option: string) => void;
  isLoading: boolean;
}

/** Per-part overrides for CioAgentRecommendations. `reactNode` at the top level replaces the whole pod. */
export type IAgentRecommendationsComponentOverrides =
  IComponentOverride<IAgentRecommendationsRootRenderProps> & {
    /** The pod title. */
    title?: IComponentOverride<{ title: string; isLoading: boolean }>;
    /** Each product card in the carousel. */
    productCard?: IComponentOverride<IAgentRecommendationsProductCardRenderProps>;
    /** The row of refinement options under the carousel. */
    refinement?: IComponentOverride<IAgentRecommendationsRefinementRenderProps>;
    /** The placeholder shown on the first load. */
    loading?: IComponentOverride<Record<string, never>>;
  };

/** Props for the CioAgentRecommendations component and useAgentRecommendations hook. */
export interface IAgentRecommendationsProps {
  /** Constructor.io API key. Required if `cioJsClient` is not provided. */
  apiKey?: string;
  /** Pre-configured Constructor.io JS client instance. Takes precedence over `apiKey`. */
  cioJsClient?: ConstructorIOClient;
  /** The id of the product on the page. The pod recommends relative to it. */
  itemId: string;
  /** The name of the product on the page. Sent with every tracking event. */
  itemName: string;
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
  /** Replaces parts of the pod, or the whole pod with `reactNode`. */
  componentOverrides?: IAgentRecommendationsComponentOverrides;
  /**
   * Replaces the whole pod. A function receives the pod's state.
   * Takes precedence over `componentOverrides.reactNode`.
   */
  children?: RenderPropsChildren<IAgentRecommendationsRootRenderProps>;
  /** Behavioral tracking options. */
  trackingConfigs?: IAgentRecommendationsTrackingConfigs;
  /** A/B test setup: the shopper's test cells and arm. */
  abTest?: IAgentRecommendationsAbTest;
}

/** A/B test setup for CioAgentRecommendations, as in the Product Insights Agent UI library. */
export interface IAgentRecommendationsAbTest {
  /**
   * Test cells to attach to the pod's requests and tracking events, as `{ [testName]: cellName }`.
   * Each entry is sent as an `ef-<testName>` parameter. Constructor's docs have the page set
   * `window.cnstrc.testCell` to a bare cell name, so label it with your test name:
   * `{ constructorio: window.cnstrc.testCell }`.
   *
   * Ignored when you supply your own `cioJsClient`: that client owns its own options, so set
   * `testCells` there instead, as a `ConstructorIOClient` constructor option. Passing both logs a
   * warning.
   */
  testCells?: Record<string, string>;
  /**
   * Mark this shopper as the control group. The pod makes no request and renders an invisible,
   * tracking-only placeholder instead, so both arms of the test record a view event. The placeholder
   * renders neither `children` nor `componentOverrides`.
   *
   * Required: stating the arm per shopper is the one thing only you can know, and leaving it out
   * would silently put every shopper in the test arm with no control group at all.
   */
  isControl: boolean;
}

/** Behavioral tracking options for CioAgentRecommendations. */
export interface IAgentRecommendationsTrackingConfigs {
  /**
   * Share of the pod that must be on screen to count as a view, from 0 to 1. Use 0.01 for an A/B
   * test, so a view counts as soon as the pod scrolls into view. @default 0.5
   */
  viewThreshold?: number;
}
