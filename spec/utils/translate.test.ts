import translate, { translateLabel } from '@src/utils/translate';

describe('translateLabel', () => {
  it('returns the override when it is set', () => {
    expect(
      translateLabel('CioAgentOverview.carousel.next', {
        'CioAgentOverview.carousel.next': 'Forward',
      })
    ).toBe('Forward');
  });

  it('falls back to the default when the override is blank', () => {
    expect(
      translateLabel('CioAgentOverview.carousel.next', {
        'CioAgentOverview.carousel.next': '',
      })
    ).toBe('Show next items');
  });

  it('falls back to the default when the override is whitespace', () => {
    expect(
      translateLabel('CioAgentOverview.carousel.next', {
        'CioAgentOverview.carousel.next': '   ',
      })
    ).toBe('Show next items');
  });
});

describe('translate', () => {
  it('returns default translation for known keys', () => {
    expect(translate('CioAgentOverview.section.aiBadge')).toBe(
      'Generated with AI'
    );
    expect(translate('CioAgentOverview.section.viewMore')).toBe('View More');
    expect(translate('CioAgentOverview.skeleton.thinking')).toBe('Thinking');
  });

  it('names the overview badge AI Overview', () => {
    expect(translate('CioAgentOverview.badge')).toBe('AI Overview');
  });

  it('has no defaults for the removed category and error keys', () => {
    [
      'CioAgentOverview.categories.viewSuggestions',
      'CioAgentOverview.categories.carouselLabel',
      'CioAgentOverview.error.message',
    ].forEach((key) => expect(translate(key)).toBe(key));
  });

  it('returns custom translation when override is provided', () => {
    const translations = {
      'CioAgentOverview.section.aiBadge': 'Custom AI Badge',
    } as const;

    expect(translate('CioAgentOverview.section.aiBadge', translations)).toBe(
      'Custom AI Badge'
    );
  });

  it('falls back to default when override does not include the key', () => {
    const translations = {
      'CioAgentOverview.section.aiBadge': 'Custom badge',
    } as const;

    expect(translate('CioAgentOverview.section.viewMore', translations)).toBe(
      'View More'
    );
  });

  it('returns the key itself for unknown keys not in defaults', () => {
    expect(translate('some.unknown.key')).toBe('some.unknown.key');
  });

  it('returns default when translations argument is undefined', () => {
    expect(translate('CioAgentOverview.section.aiBadge', undefined)).toBe(
      'Generated with AI'
    );
  });

  it('prefers custom translation over default', () => {
    const translations = {
      'CioAgentOverview.skeleton.thinking': 'Loading',
    } as const;

    expect(translate('CioAgentOverview.skeleton.thinking', translations)).toBe(
      'Loading'
    );
  });
});
