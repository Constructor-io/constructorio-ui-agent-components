// @vitest-environment node
import path from 'node:path';
import vm from 'node:vm';

import { build, type Rollup } from 'vite';

const ROOT = path.resolve(__dirname, '..');

// The standalone bundle goes on a CDN for sites that add it with a <script> tag. A browser has no
// `process`, so the bundle mustn't read `process.env` (React picks its build by NODE_ENV).
describe('standalone bundle', () => {
  let code: string;

  beforeAll(async () => {
    const output = (await build({
      configFile: path.join(ROOT, 'vite.standalone.config.ts'),
      root: ROOT,
      logLevel: 'silent',
      build: { write: false },
    })) as Rollup.RollupOutput | Rollup.RollupOutput[];
    const [first] = Array.isArray(output) ? output : [output];
    const chunk = first.output.find(
      (file): file is Rollup.OutputChunk => file.type === 'chunk'
    );
    code = chunk?.code ?? '';
  }, 120_000);

  // The JS client checks `typeof process` first, so only NODE_ENV is a problem.
  it('does not read process.env.NODE_ENV', () => {
    expect(code).not.toMatch(/\bprocess\.env\.NODE_ENV\b/);
  });

  it('loads on a page that has no process global', () => {
    const page: Record<string, unknown> = {};
    page.window = page;
    page.self = page;
    page.globalThis = page;
    vm.runInNewContext(code, page);
    expect(typeof (page.CioAgentOverview as { init?: unknown })?.init).toBe(
      'function'
    );
  });
});
