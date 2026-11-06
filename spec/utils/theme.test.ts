import buildThemeStyles from '@src/utils/theme';

describe('buildThemeStyles', () => {
  it('should map theme keys to CSS variables', () => {
    expect(
      buildThemeStyles({ primaryColor: '#111', spacingMd: '12px' })
    ).toEqual({ '--cio-color-primary': '#111', '--cio-spacing-md': '12px' });
  });

  it('should return no styles without a theme', () => {
    expect(buildThemeStyles(undefined)).toEqual({});
  });

  it('should block script and data URLs and strip angle brackets', () => {
    expect(
      buildThemeStyles({
        background: 'url(javascript:alert(1))',
        fontFamily: '<i> data:x</i>',
      })
    ).toEqual({
      '--cio-color-background': 'url(blocked:alert(1))',
      '--cio-font-family': 'i blocked:x/i',
    });
  });
});
