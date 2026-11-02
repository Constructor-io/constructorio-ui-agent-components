import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '../src');
const ROOT_CLASS = '.cio-agent-overview-root';

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) return cssFiles(file);
    return file.endsWith('.css') ? [file] : [];
  });
}

function selectors(css: string): string[] {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...withoutComments.matchAll(/([^{}@;]+)\{/g)]
    .flatMap((match) => match[1].split(','))
    .map((selector) => selector.trim())
    .filter(Boolean);
}

// vite.lib.config.ts prefixes every selector with the root class, except the root class alone.
// A selector that already starts with it is built as `.root .root …`, which matches nothing in
// the published stylesheet, though it still works in Storybook, which doesn't prefix.
describe('stylesheets', () => {
  it.each(cssFiles(SRC).map((file) => [path.relative(SRC, file), file]))(
    '%s does not start a selector with the root class',
    (_, file) => {
      const offending = selectors(readFileSync(file, 'utf8')).filter(
        (selector) => selector !== ROOT_CLASS && selector.startsWith(ROOT_CLASS)
      );
      expect(offending).toEqual([]);
    }
  );
});
