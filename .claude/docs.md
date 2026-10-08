# Documentation rules

Storybook is the product documentation. The published site is built with
`storybook build --docs`, so only docs pages ship: MDX files and auto-generated
(`autodocs`) pages. Stories never appear on their own.

## One home per fact

| Content | Lives in |
|---|---|
| How to do something | a guide: `stories/guides/*.mdx`, title `Guides/<Name>` |
| What a prop is | JSDoc on `IAgentOverviewProps`, shown on `Components & Utilities/CioAgentOverview`. Add to `argTypes` in `stories/fixtures.ts` only what JSDoc can't express, such as a link |
| Other exports (hook, section components, JavaScript bundle) | a `stories/reference/*.mdx` page |
| Install, one snippet, contributing, publishing | `README.md` |

Never restate a fact in a second place: link to its home. The README never
documents props or features.

## Public API only

Customers can import only what `src/index.ts` and the standalone bundle export.
Docs, snippets and stories import from `@src`, never from internal paths.

## Writing

- Brief. Lead with the snippet; one sentence per idea; no "This page covers…".
- Name the prop path exactly (`callbacks.getViewMoreUrl`).
- Every snippet must work if copied. Keep `domains` out of the render, since a
  new object restarts the stream.
- A new translation key or theme property goes in its table in the
  Customization guide.

## Stories

- `reference/CioAgentOverview.stories.tsx` has `tags: ['autodocs']` and one
  story, `Default`, which drives the reference page's preview and props table.
- Demos go in `stories/examples/`, tagged `tags: ['!dev']`: hidden from the
  sidebar, still embeddable with `<Canvas of={…} />`, still run by the axe
  tests. Never give them `autodocs`, which would publish them.
- Embed a story only when its effect is visible on screen. Callbacks and
  network behaviour get a code snippet instead.
- Shared story values (demo key, `domains`, `demoArgs`, `argTypes`) live in
  `stories/fixtures.ts`.

## Adding a guide

1. `stories/guides/<Name>.mdx` with `<Meta title='Guides/<Name>' />`.
2. Add it to `storySort` in `.storybook/preview.ts`.
3. If it is part of a first integration, add a step to the Integration Guide
   that links to it.

## Links

Link with `?path=/docs/<id>`. The id is the title lowercased with
non-alphanumerics turned into `-`, plus `--docs`
(`Components & Utilities/JavaScript Bundle` →
`components-utilities-javascript-bundle--docs`). Renaming a title breaks every
link to it.

## Before merging

- `npm run lint`
- `npm run build-storybook`, then check the sidebar shows only Introduction,
  Guides and Components & Utilities, and that every `?path=` link in
  `stories` exists in `docs/index.json`
- `npm run test-storybook`
