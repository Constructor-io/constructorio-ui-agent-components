import type { Translations } from '../types';

const defaultTranslations: Translations = {
  'CioAgentOverview.badge': 'AI Overview',
  'CioAgentOverview.skeleton.thinking': 'Thinking',
  'CioAgentOverview.carousel.previous': 'Show previous items',
  'CioAgentOverview.carousel.next': 'Show next items',
  'CioAgentOverview.carousel.label': 'Products',
  'CioAgentOverview.status.loading': 'Loading AI Overview',
  'CioAgentOverview.status.done': 'AI Overview loaded',
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
