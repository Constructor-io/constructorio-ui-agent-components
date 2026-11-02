# Documentation rules

Storybook is the product documentation. The published site is built with
`storybook build --docs`, so only docs pages ship: MDX files and auto-generated
(`autodocs`) pages. Stories never appear on their own.

## Layout

The library holds several components. Each has its own top-level sidebar
section and folder; only what applies to every component sits outside one.

```
stories/
  Introduction.mdx      one card per component, library-wide requirements
  FAQ.mdx               setup problems; component-specific ones prefixed with its name
  <component>/
    guides/             title '<Component>/<Guide>', Integration Guide first
    reference/          title '<Component>/Components & Utilities/<Export>'
    examples/           title '<Component>/Examples/<Name>', tagged !dev
    fixtures.ts         demo key, args, argTypes
```

## One home per fact

| Content | Lives in |
|---|---|
| How to do something with a component | a guide in `stories/<component>/guides/` |
| What a prop is | JSDoc on the component's props type, shown on its autodocs page. Add to `argTypes` in the component's `fixtures.ts` only what JSDoc can't express, such as a link |
| Other exports (hooks, building blocks, the JavaScript bundle) | an MDX page in `stories/<component>/reference/` |
| True of every component (install, React version, stylesheet) | `stories/Introduction.mdx` |
| Install, one snippet per component, contributing, publishing | `README.md` |

Never restate a fact in a second place: link to its home. The README never
documents props or features.

## Public API only

Customers can import only what `src/index.ts` and the standalone bundle export.
Docs, snippets and stories import from `@src`, never from internal paths.

## Writing

- Brief. Lead with the snippet; one sentence per idea; no "This page covers…".
- Name the prop path exactly (`callbacks.getViewMoreUrl`).
- Every snippet must work if copied.
- A new translation key or theme property goes in its table in the
  component's Customization guide.

## Stories

- A component's `reference/<Component>.stories.tsx` has `tags: ['autodocs']`
  and one story, `Default`, which drives the reference page's preview and
  props table.
- Demos go in `stories/<component>/examples/`, tagged `tags: ['!dev']`: hidden from the
  sidebar, still embeddable with `<Canvas of={…} />`, still run by the axe
  tests. Never give them `autodocs`, which would publish them.
- Embed a story only when its effect is visible on screen. Callbacks and
  network behaviour get a code snippet instead.
- A component's shared story values (demo key, args, `argTypes`) live in its
  `fixtures.ts`.

## Adding a component

1. `stories/<component>/` with at least `guides/IntegrationGuide.mdx` and
   `reference/<Component>.stories.tsx`. Copy the Agent Overview section's shape.
2. Add the section to `storySort` in `.storybook/preview.ts`, in the same order
   as Agent Overview's: guides, then `Components & Utilities`.
3. Add a card to `stories/Introduction.mdx` linking its Integration Guide, and
   a row and snippet to the README.

## Adding a guide

1. `stories/<component>/guides/<Name>.mdx` with
   `<Meta title='<Component>/<Name>' />`.
2. Add it to `storySort` in `.storybook/preview.ts`.
3. If it is part of a first integration, add a step to the Integration Guide
   that links to it.

## Links

Link with `?path=/docs/<id>`. The id is the title lowercased with
non-alphanumerics turned into `-`, plus `--docs`
(`Agent Overview/Components & Utilities/JavaScript Bundle` →
`agent-overview-components-utilities-javascript-bundle--docs`). Renaming a title breaks every
link to it.

## Before merging

- `npm run lint`
- `npm run build-storybook`, then check the sidebar shows only Introduction,
  one section per component, and FAQ, and that every `?path=` link in
  `stories` exists in `docs/index.json`
- `npm run test-storybook`
