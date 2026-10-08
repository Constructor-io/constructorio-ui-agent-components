# Constructor.io Agent Components UI Library

[![npm](https://img.shields.io/npm/v/@constructor-io/constructorio-ui-agent-components)](https://www.npmjs.com/package/@constructor-io/constructorio-ui-agent-components)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Constructor-io/constructorio-ui-agent-components/blob/master/LICENSE)

React components for Constructor.io's agentic experiences. Agent Overview streams AI-generated category suggestions and product recommendations for a shopping intent.

**[Documentation →](https://constructor-io.github.io/constructorio-ui-agent-components/)**

## Install

```bash
npm i @constructor-io/constructorio-ui-agent-components
```

## Usage

```jsx
import CioAgentOverview from '@constructor-io/constructorio-ui-agent-components';
import '@constructor-io/constructorio-ui-agent-components/styles.css';

const domains = { suggestions: 'YOUR_SUGGESTIONS_DOMAIN', results: 'YOUR_RESULTS_DOMAIN' };

<CioAgentOverview apiKey='YOUR_API_KEY' intent='I want to buy shoes' domains={domains} />;
```

The JavaScript bundle, the headless hook, callbacks, theming and every prop are in the [docs](https://constructor-io.github.io/constructorio-ui-agent-components/).

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
4. Run `npm run lint` and `npm run test` to verify. For docs changes, follow [`.claude/docs.md`](.claude/docs.md).
5. Submit a PR for review.

## License

MIT &copy; [Constructor.io Corporation](https://constructor.io/)
