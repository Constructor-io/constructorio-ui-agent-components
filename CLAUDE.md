# constructorio-ui-agent-components

Library of embeddable React components for Constructor's agentic experiences.
Its first component, Agent Overview, streams AI-generated category suggestions
and product recommendation sections for a shopping intent. It is published to
npm and runs inside a customer's site, so it is a guest on a page it does not own.

## Documentation

**Read `.claude/docs.md` before adding or changing any MDX, story, or README
content.** It says where each kind of content lives and what ships publicly.

## Accessibility

**Read `.claude/a11y.md` before reviewing or writing any JSX/TSX or CSS**, whether
the request says "accessibility" or not. Most regressions here arrive inside
changes made for some other reason.

Two automated layers are the merge gate, and both already run in CI:

- `npm run lint` — `eslint-plugin-jsx-a11y`, static issues in the source
- `npm test -- --run` — `axe-core` in real Chromium against every story (the
  `storybook` vitest project; `npm run test-storybook` runs it alone)

Every story sets `a11y: { test: 'error' }`. The stories render against the live
demo API, so axe checks whichever state is on screen when the story settles;
state-specific markup (loading, error, carousels) is covered by the jsdom unit
tests in `spec/`.

Color is out of scope: `color-contrast` is disabled in the axe run because the
palette is the consumer's to restyle through `theme`. State conveyed *only* by
color still needs a non-visual equivalent.

## Constraints that shape the code

- **The DOM structure is public API.** `cio-agent-overview-*` class names are
  what customers style against. Adding, removing or reordering elements can break
  their CSS even when our own rendering looks unchanged.
- **The stylesheet is optional.** `styles.css` is a separate import. Anything that
  must never be visible needs an inline style, not only a class.
- **`translate()` returns an explicitly provided string as-is.** Blanking a
  string is how consumers hide it; do not "fix" that. Strings that exist only
  for assistive technology (accessible names, live-region messages) cannot be
  blank, so they go through `translateLabel()`, which falls
  back to the default string instead. Add every
  user-facing string, including accessible names and live-region text, to
  `defaultTranslations` (`src/utils/translate.ts`), the `Translations` type
  (`src/types/index.ts`) and the table in the Customization guide.
- **Only `src/index.ts` is public.** Components and hooks outside it can change
  shape freely.

## Commands

- `npm run storybook` — Storybook on 6006
- `npm run test:unit` — jsdom unit tests
- `npm run test-storybook` — axe against stories in Chromium
- `npm run lint`, `npm run check-types`
