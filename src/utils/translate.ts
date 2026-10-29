import type { Translations } from '../types';

const defaultTranslations: Translations = {
  'CioAgentOverview.section.aiBadge': 'Generated with AI',
  'CioAgentOverview.categories.viewSuggestions': 'View suggestions',
  'CioAgentOverview.section.viewMore': 'View More',
  'CioAgentOverview.skeleton.thinking': 'Thinking',
  'CioAgentOverview.carousel.previous': 'Show previous items',
  'CioAgentOverview.carousel.next': 'Show next items',
  'CioAgentOverview.carousel.label': 'Products',
  'CioAgentOverview.categories.carouselLabel': 'Categories',
  'CioAgentOverview.error.message': 'Something went wrong. Please try again.',
  'CioAgentRecommendations.fallbackTitle': 'You may also like',
  'CioAgentRecommendations.refinement.label': 'Refine recommendations',
};

/**
 * Accessible names cannot be blanked the way visible text can, so an empty
 * override falls back to the default string.
 */
export function translateLabel(
  word: keyof Translations,
  translations?: Translations
): string {
  return (
    translate(word, translations).trim() || defaultTranslations[word] || word
  );
}

export default function translate(
  word: string,
  translations?: Translations
): string {
  if (translations?.[word as keyof Translations] !== undefined) {
    return translations[word as keyof Translations] as string;
  }

  return (defaultTranslations[word as keyof Translations] as string) || word;
}
