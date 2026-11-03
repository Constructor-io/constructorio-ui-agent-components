import type { AgentInsightsPromise } from '../app/services/agentInsightsTypes';

/**
 * One entry of a Constructor search response's `agentic_promises`, passed as it came. The overview
 * uses the one whose `pod.id` is `search_ai_overview`.
 */
export type IAgenticPromise = AgentInsightsPromise;

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
  /** Called when a user clicks a product card, with the product set the product came from. */
  onProductClick?: (
    event: React.MouseEvent,
    product: IProduct,
    section: IAgentOverviewSection
  ) => void;
  /** Builds a URL for a product card link. If not provided, the product's default URL is used. */
  getProductUrl?: (product: IProduct) => string;
  /**
   * Called when search promised an overview but the agent turned it down (a 204, or a 422 for a query
   * it finds unsuitable), so the page can collapse the space it kept for one. Not called for a search
   * without a promise.
   */
  onNoOverview?: () => void;
  /**
   * Called when the overview fails: any other status but 200, or a `server_error` while it streams.
   * Nothing is shown to the shopper.
   */
  onError?: (error: IAgentOverviewError) => void;
}

/**
 * Translations type for internationalizing UI strings.
 * All keys are optional — any non-provided translation will fall back to the English default.
 */
export type Translations = {
  'CioAgentOverview.badge'?: string;
  'CioAgentOverview.skeleton.thinking'?: string;
  'CioAgentOverview.carousel.previous'?: string;
  'CioAgentOverview.carousel.next'?: string;
  'CioAgentOverview.carousel.label'?: string;
};

/** One set of products in an overview, as one `item_results` event streamed it. */
export interface IAgentOverviewSection {
  /** What the set is, such as "Casual Shirt". */
  title: string;
  /** The id of the search or browse response the products came from, for your own tracking. */
  searchResultId?: string;
  products: IProduct[];
}

/** Why an overview request failed. */
export interface IAgentOverviewError {
  /** The HTTP status, or 0 when the request never got a response. */
  status: number;
  /** The API's error code, such as `rate_limit_exceeded`, when it sent one. */
  code?: string;
  message: string;
}

/**
 * Where an overview request is: `idle` without an AI Overview promise, `loading` until the stream
 * opens, `streaming` while it arrives, then `done`, `no-overview` (the agent turned it down) or
 * `error`.
 */
export type AgentOverviewStatus =
  'idle' | 'loading' | 'streaming' | 'done' | 'no-overview' | 'error';

/** Props for the CioAgentOverview component and useAgentOverview hook. */
export interface IAgentOverviewProps {
  /**
   * `response.agentic_promises` from the Constructor search response for the page's search, as it
   * came. The overview sends the promise for `search_ai_overview`; without one, nothing renders and
   * no request is made. A new search response starts a new overview.
   */
  agenticPromises?: IAgenticPromise[] | null;
  /** Theme overrides for customizing visual appearance via CSS custom properties. */
  theme?: CioAgentOverviewTheme;
  /** Callback functions for handling user interactions. */
  callbacks?: IAgentOverviewCallbacks;
  /** Translation overrides for internationalizing UI strings. */
  translations?: Translations;
}

/** What useAgentOverview returns. */
export interface UseAgentOverviewReturn {
  status: AgentOverviewStatus;
  /** The overview's text. Several messages are joined with a blank line. */
  message: string;
  /** The product sets so far, in the order they arrived. */
  sections: IAgentOverviewSection[];
  /** The overview's id, once the stream has opened. */
  resultId: string | null;
  /** The conversation thread the overview opened, when it opened one. */
  threadId: string | null;
  /** Set when `status` is `error`. */
  error: IAgentOverviewError | null;
  /** The label search gave the overview (`pod.display_name`, e.g. "AI Overview"), when it sent a promise. */
  displayName: string | null;
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
