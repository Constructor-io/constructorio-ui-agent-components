import type { CioAgentOverviewTheme } from '../types';

const themePropToCssVar: Record<keyof CioAgentOverviewTheme, string> = {
  /* Typography */
  fontFamily: '--cio-font-family',
  fontSizeXs: '--cio-font-size-xs',
  fontSizeSm: '--cio-font-size-sm',
  fontSizeBase: '--cio-font-size-base',
  fontSizeLg: '--cio-font-size-lg',
  lineHeight: '--cio-line-height',
  fontWeightNormal: '--cio-font-weight-normal',
  fontWeightMedium: '--cio-font-weight-medium',
  fontWeightSemibold: '--cio-font-weight-semibold',
  fontWeightBold: '--cio-font-weight-bold',

  /* Colors */
  primaryColor: '--cio-color-primary',
  secondaryColor: '--cio-color-secondary',
  mutedColor: '--cio-color-muted',
  subtleColor: '--cio-color-subtle',
  productNameColor: '--cio-color-product-name',
  borderColor: '--cio-color-border',
  background: '--cio-color-background',
  backgroundMuted: '--cio-color-background-muted',
  hoverAccentColor: '--cio-color-hover-accent',

  /* Carousel arrows */
  arrowSize: '--cio-arrow-size',
  arrowBorderRadius: '--cio-arrow-border-radius',
  arrowBorderColor: '--cio-arrow-border-color',
  arrowBorderColorHover: '--cio-arrow-border-color-hover',
  arrowColor: '--cio-arrow-color',
  arrowShadow: '--cio-arrow-shadow',
  arrowShadowHover: '--cio-arrow-shadow-hover',

  /* Spacing */
  spacingXs: '--cio-spacing-xs',
  spacingSm: '--cio-spacing-sm',
  spacingMd: '--cio-spacing-md',
  spacingLg: '--cio-spacing-lg',
  spacingXl: '--cio-spacing-xl',
  spacing2xl: '--cio-spacing-2xl',
};

function sanitizeCssValue(value: string): string {
  return value
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, 'blocked:')
    .trim();
}

/** Maps theme props onto the CSS custom properties the stylesheet reads. */
export default function buildThemeStyles(
  theme: CioAgentOverviewTheme | undefined
): React.CSSProperties {
  if (!theme) return {};

  const styles: Record<string, string> = {};
  for (const [key, value] of Object.entries(theme)) {
    if (value !== undefined) {
      const varName = themePropToCssVar[key as keyof CioAgentOverviewTheme];
      if (varName) {
        styles[varName] = sanitizeCssValue(String(value));
      }
    }
  }
  return styles;
}
