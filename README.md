# Constructor.io Agent Components UI Library

[![npm](https://img.shields.io/npm/v/@constructor-io/constructorio-ui-agent-components)](https://www.npmjs.com/package/@constructor-io/constructorio-ui-agent-components)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Constructor-io/constructorio-ui-agent-components/blob/master/LICENSE)

A UI library of React components for Constructor.io's agentic experiences. It currently ships [Agent Overview](https://constructor.io/), which streams and renders AI-generated product recommendation sections. TypeScript support is available.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Usage](#usage)
- [Customization](#customization)
- [Troubleshooting](#troubleshooting)
- [Local Development](#local-development)
- [Publishing New Versions](#publishing-new-versions)
- [Supporting Docs](#supporting-docs)
- [Related Libraries](#related-libraries)
- [Contributing](#contributing)
- [License](#license)

## Overview

[Constructor.io's Agent Overview](https://constructor.io/) streams AI-generated product recommendation sections in real time. Given a user intent (e.g. "I want to buy casual shoes"), it presents category suggestions followed by detailed product results. This UI library simplifies the integration process by providing React components and a framework-agnostic standalone bundle that handle the streaming, parsing, and rendering logic.

[Our Storybook Docs](https://constructor-io.github.io/constructorio-ui-agent-components) are the best place to explore the behavior and the available configuration options for this UI library.

## Installation

```bash
npm i @constructor-io/constructorio-ui-agent-components
```

### Prerequisites

- Node.js >= 20
- React >= 16.12.0
- React DOM >= 16.12.0

## Usage

### Using the JavaScript Bundle

This is a framework-agnostic method that can be used in any JavaScript project. The `CioAgentOverview` function provides a simple interface to inject the Agent Overview component into the provided `selector`.

```js
import CioAgentOverview from '@constructor-io/constructorio-ui-agent-components/constructorio-ui-agent-components-standalone';

CioAgentOverview.init({
  selector: '#agent-overview',
  includeCSS: true, // Include the default CSS styles - defaults to true
  apiKey: 'YOUR_API_KEY',
  intent: 'I want to buy shoes',
  domains: {
    suggestions: 'searchbar',
    results: 'explorer',
  },
});
```

### Using the React Hook

For full control over rendering, use the `useAgentOverview` hook directly.

```jsx
import { useAgentOverview, RecommendationSection } from '@constructor-io/constructorio-ui-agent-components';
import '@constructor-io/constructorio-ui-agent-components/styles.css';

function MyAgentOverview() {
  const {
    phase,
    categories,
    categoryDescription,
    sections,
    selectCategory,
    isLoading,
    error,
  } = useAgentOverview({
    apiKey: 'YOUR_API_KEY',
    intent: 'I want to buy shoes',
    domains: { suggestions: 'searchbar', results: 'explorer' },
  });

  if (error) return <p>{error}</p>;

  if (phase === 'categories') {
    return (
      <div>
        <p>{categoryDescription}</p>
        {categories.map((category) => (
          <button key={category.title} onClick={() => selectCategory(category)}>
            {category.title}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      {isLoading && <p>Loading...</p>}
      {sections.map((section) => (
        <RecommendationSection key={section.title} section={section} />
      ))}
    </div>
  );
}
```

### Configuration Options

| Prop | Type | Description |
|------|------|-------------|
| `apiKey` | `string` | Your Constructor.io API key (required if `cioJsClient` is not provided) |
| `cioJsClient` | `ConstructorIOClient` | Pre-configured Constructor.io JS client instance (takes precedence over `apiKey`) |
| `intent` | `string` | The user's search intent that drives agent recommendations (required) |
| `domains` | `object` | Domain identifiers for category suggestions and product results (required) |
| `theme` | `object` | Theme overrides for customizing visual appearance via CSS custom properties |
| `callbacks` | `object` | Callback functions for handling user interactions |
| `translations` | `object` | Translation overrides for internationalizing UI strings |

**Callbacks:**

| Option | Type | Description |
|--------|------|-------------|
| `onProductClick` | `(event, product, section) => void` | Called when a user clicks on a product card |
| `onCategoryClick` | `(category) => void` | Called when a user clicks on a category card |
| `getProductUrl` | `(product) => string` | Builds a URL for a product card link |
| `getViewMoreUrl` | `(section) => string` | Builds a "View more" URL from section data |

## Customization

### Styling

By default, importing React components from this library does not pull any CSS into your project.

If you wish to use some starter styles from this library, add an import statement similar to the example below:

```js
import '@constructor-io/constructorio-ui-agent-components/styles.css';
```

- These starter styles can be used as a foundation to build on top of, or just as a reference for you to replace completely.
- To opt out of all default styling, do not import the `styles.css` stylesheet.
- All starter styles in this library are scoped within the `.cio-agent-overview` CSS selector.
- These starter styles are intended to be extended by layering in your own CSS rules.

> Note: When using the JavaScript Bundle, CSS is included by default via the `includeCSS` option (defaults to `true`).

### Theming

The component supports extensive theming via the `theme` prop, which maps to CSS custom properties:

```jsx
<CioAgentOverview
  apiKey='YOUR_API_KEY'
  intent='I want to buy shoes'
  domains={{ suggestions: 'searchbar', results: 'explorer' }}
  theme={{
    primaryColor: '#1a1a1a',
    fontFamily: 'Inter, sans-serif',
    borderColor: '#e0e0e0',
  }}
/>
```

See our [Storybook Docs](https://constructor-io.github.io/constructorio-ui-agent-components) for the full list of available theme properties.

### Translations

All UI strings can be customized via the `translations` prop for internationalization:

```jsx
<CioAgentOverview
  apiKey='YOUR_API_KEY'
  intent='I want to buy shoes'
  domains={{ suggestions: 'searchbar', results: 'explorer' }}
  translations={{
    'CioAgentOverview.section.aiBadge': 'AI Powered',
    'CioAgentOverview.categories.viewSuggestions': 'View suggestions',
    'CioAgentOverview.section.viewMore': 'See all',
    'CioAgentOverview.skeleton.thinking': 'Loading...',
    'CioAgentOverview.carousel.previous': 'Show previous items',
    'CioAgentOverview.carousel.next': 'Show next items',
    'CioAgentOverview.carousel.label': 'Products',
    'CioAgentOverview.categories.carouselLabel': 'Categories',
    'CioAgentOverview.error.message': 'Something went wrong',
  }}
/>
```

## Troubleshooting

### Known Issues

**Older JavaScript environments**

The library provides two different builds: CommonJS (cjs) and ECMAScript Modules (esm).

For ECMAScript Modules (esm) build, the JavaScript version is ESNext which might not be supported by your environment. If that's the case and your environment is using an older JavaScript version like ES6 (ES2015), you may get this error:

`Module parse failed: Unexpected token`
`You may need an appropriate loader to handle this file type, currently no loaders are configured to process this file`

To solve this you can import the CommonJS (cjs) build which supports ES6 (ES2015) syntax:

`import CioAgentOverview from '@constructor-io/constructorio-ui-agent-components'`

(The default import resolves to the CJS build in environments that support `require`.)

**ESLint**

There is a known issue with ESLint where it fails to resolve the paths exposed in the `exports` statement of NPM packages. If you are receiving the following error, you can safely disable ESLint using `// eslint-disable-line` for that line.

`Unable to resolve path to module '@constructor-io/constructorio-ui-agent-components/styles.css'`

Relevant open issues: [Issue 1868](https://github.com/import-js/eslint-plugin-import/issues/1868), [Issue 1810](https://github.com/import-js/eslint-plugin-import/issues/1810)

## Local Development

### Development Scripts

```bash
npm ci                  # Install dependencies for local dev
npm run storybook       # Start a local dev server for Storybook
npm run lint            # Run lint
npm run test            # Run tests
npm run check-types     # Run TypeScript type checking
npm run test:coverage   # Run tests with coverage report
```

### Library Maintenance

```bash
npm run build             # Generate dist folder for publishing to npm
npm run build-storybook   # Generate Storybook static bundle for deploy with GitHub Pages
```

## Publishing New Versions

Dispatch the [Publish](https://github.com/Constructor-io/constructorio-ui-agent-components/actions/workflows/publish.yml) workflow in GitHub Actions. You're required to provide two arguments:

- **Version Strategy**: `major`, `minor`, or `patch`.
- **Title**: A title for the release.

This workflow will automatically:

1. Bump the library version using the provided strategy.
2. Create a new git tag.
3. Create a new GitHub release.
4. Compile the library.
5. Publish the new version to NPM.
6. Deploy the Storybook docs to GitHub Pages.

#### Note: Please don't manually increase the package.json version or create new git tags.

The library version is tracked by releases and git tags. We intentionally keep the package.json version at `0.0.0` to avoid pushing changes to the `master` branch. This solves many security concerns by avoiding the need for branch-protection rule exceptions.

## New Storybook Version

Dispatch the [Deploy Storybook](https://github.com/Constructor-io/constructorio-ui-agent-components/actions/workflows/deploy-storybook.yml) workflow in GitHub Actions.

#### Note: This is already done automatically when publishing a new version.

## Supporting Docs

- [Storybook Docs](https://constructor-io.github.io/constructorio-ui-agent-components)
- [Constructor.io API Documentation](https://docs.constructor.io/)

## Related Libraries

- [@constructor-io/constructorio-client-javascript](https://github.com/Constructor-io/constructorio-client-javascript) - JavaScript client for Constructor.io API
- [@constructor-io/constructorio-ui-pia](https://github.com/Constructor-io/constructorio-ui-pia) - AI Product Insights Agent UI library
- [@constructor-io/constructorio-ui-autocomplete](https://github.com/Constructor-io/constructorio-ui-autocomplete) - Autocomplete UI library
- [@constructor-io/constructorio-ui-plp](https://github.com/Constructor-io/constructorio-ui-plp) - Product Listing Page UI library
- [@constructor-io/constructorio-ui-quizzes](https://github.com/Constructor-io/constructorio-ui-quizzes) - Quizzes UI library

## Contributing

1. Fork the repo and create a new branch.
2. Run `npm ci` to install dependencies.
3. Make your changes.
4. Run `npm run lint` and `npm run test` to verify.
5. Submit a PR for review.

## License

MIT &copy; [Constructor.io Corporation](https://constructor.io/)
