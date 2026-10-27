import { describe, expect, test } from 'bun:test';
import { SourceGuard } from '../scripts/quality/SourceGuard.mts';
import { OptionParser } from '../src/cli/Options.ts';
import { ApiConfig } from '../src/api/config/ApiConfig.ts';

describe('source guard', () => {
  const guard = new SourceGuard();
  test('rejects a nested conditional even through a loop', () => {
    expect(guard.inspect('sample.ts', 'if (a) { for (const x of xs) { if (x) run(); } }').map(issue => issue.message)).toContain('Nested if');
  });
  test('resets conditional ancestry at a function boundary', () => {
    expect(guard.inspect('sample.ts', 'if (a) { const action = () => { if (b) run(); }; }')).toEqual([]);
  });
  test('does not confuse text or comments with syntax', () => {
    expect(guard.inspect('sample.ts', '// if (a) if (b)\nconst text = "any";')).toEqual([]);
  });
  test('rejects explicit any in TS and TSX', () => {
    expect(guard.inspect('sample.tsx', 'const data: any = <Text />;').map(issue => issue.message)).toContain('Explicit any');
  });
  test.each(['app.js', 'app.jsx', 'app.cjs', 'app.mjs'])('rejects maintained %s', file => {
    expect(guard.inspect(file, '').length).toBe(1);
  });
  test('keeps maintained modules within the size budget', () => {
    expect(guard.inspect('large.ts', '\n'.repeat(251)).length).toBe(1);
  });
});

describe('configuration', () => {
  const parser = new OptionParser();
  test('parses bounded intervals and JSON snapshot mode', () => {
    expect(parser.parse(['--interval', '250', '--history', '300', '--json'])).toMatchObject({ interval: 250, history: 300, json: true, once: true });
  });
  test.each([['--interval', '0'], ['--history', '3'], ['--interval', 'NaN'], ['--wat'], ['--connect']].map(args => ({ args })))('rejects invalid arguments %j', ({ args }) => {
    expect(() => parser.parse(args)).toThrow();
  });
  test('keeps remote sessions distinct from local serving', () => {
    expect(() => parser.parse(['--serve', '--connect', 'http://example.test'])).toThrow();
    expect(() => parser.parse(['--serve', '--no-api'])).toThrow();
  });
  test('binds the configured port on all network interfaces', () => {
    expect(new ApiConfig().read({ MTUI_PORT: '8123', MTUI_TOKEN: ' secret ' })).toEqual({ port: 8123, hostname: '0.0.0.0', token: 'secret' });
  });
  test.each(['0', '65536', '3.5', 'hello', ''])('rejects invalid API port %s', port => {
    expect(() => new ApiConfig().read({ MTUI_PORT: port })).toThrow();
  });
});
