// @vitest-environment node
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

const ROOT = path.resolve(__dirname, '..');
const TYPES = path.join(ROOT, 'dist/types');

function declarationFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) return declarationFiles(file);
    return file.endsWith('.d.ts') ? [file] : [];
  });
}

// The published declarations are what a TypeScript site compiles against. `@src/*` is this repo's
// own path alias: a site can't resolve it, so whatever it imports becomes `any`.
describe('published type declarations', () => {
  beforeAll(() => {
    execFileSync('npm', ['run', 'build:types'], { cwd: ROOT, stdio: 'pipe' });
  }, 120_000);

  it('should not import through the @src alias', () => {
    const offending = declarationFiles(TYPES).filter((file) =>
      /from ['"]@src\//.test(readFileSync(file, 'utf8'))
    );
    expect(offending.map((file) => path.relative(TYPES, file))).toEqual([]);
  });

  it("should give a site the hook's real types", () => {
    const dir = path.join(ROOT, 'node_modules/.cache/types-test');
    mkdirSync(dir, { recursive: true });
    const consumer = path.join(dir, 'consumer.ts');
    const entry = path
      .relative(dir, path.join(TYPES, 'index'))
      .split(path.sep)
      .join('/');
    writeFileSync(
      consumer,
      `import { useAgentOverview } from '${entry}';\n` +
        // status is a string union, so assigning it to a number must fail to compile.
        `export const status: number = useAgentOverview({}).status;\n`
    );

    const program = ts.createProgram([consumer], {
      strict: true,
      noEmit: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ES2020,
      skipLibCheck: true,
      types: [],
    });
    const messages = ts
      .getPreEmitDiagnostics(program)
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));

    expect(messages).toEqual([
      expect.stringMatching(/Type '.*' is not assignable to type 'number'/),
    ]);
  });
});
