#!/usr/bin/env node
// Rewrites this repo's `@src/*` path alias in emitted type declarations to relative paths.
// TypeScript keeps path aliases as written, and a site compiling against the published types
// can't resolve them, so whatever they import would become `any`.
//
// Usage: node bin/resolve-type-aliases.mjs <declaration dir, the src root's output>
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'dist/types');
const ALIAS = /(\bfrom\s+|\bimport\(\s*)(['"])@src\/([^'"]+)\2/g;

function declarationFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) return declarationFiles(file);
    return file.endsWith('.d.ts') ? [file] : [];
  });
}

let rewritten = 0;
for (const file of declarationFiles(root)) {
  const source = readFileSync(file, 'utf8');
  const output = source.replace(ALIAS, (_, keyword, quote, target) => {
    let relative = path
      .relative(path.dirname(file), path.join(root, target))
      .split(path.sep)
      .join('/');
    if (!relative.startsWith('.')) relative = `./${relative}`;
    return `${keyword}${quote}${relative}${quote}`;
  });
  if (output !== source) {
    writeFileSync(file, output);
    rewritten += 1;
  }
}
console.log(`resolve-type-aliases: rewrote @src imports in ${rewritten} file(s)`);
