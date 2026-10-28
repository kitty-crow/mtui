import { describe, expect, test } from 'bun:test';
import { ConsoleEncoding } from '../src/application/ConsoleEncoding.ts';

describe('Windows console encoding', () => {
  test('enables UTF-8 for an interactive Windows console and restores its previous code page', () => {
    const commands: Array<string | undefined> = [];
    const run = (codePage?: string): string => {
      commands.push(codePage);
      return codePage === undefined ? 'Active code page: 437' : 'Active code page: ' + codePage;
    };
    const restore = new ConsoleEncoding('win32', true, run).prepare();
    expect(commands).toEqual([undefined, '65001']);
    restore();
    expect(commands).toEqual([undefined, '65001', '437']);
  });

  test('preserves an existing UTF-8 console without changing it', () => {
    const commands: Array<string | undefined> = [];
    const restore = new ConsoleEncoding('win32', true, codePage => {
      commands.push(codePage);
      return 'Active code page: 65001';
    }).prepare();
    restore();
    expect(commands).toEqual([undefined]);
  });

  test('never changes Unix terminals or redirected Windows output', () => {
    let calls = 0;
    const run = (): string => { calls++; return 'Active code page: 437'; };
    new ConsoleEncoding('linux', true, run).prepare()();
    new ConsoleEncoding('darwin', true, run).prepare()();
    new ConsoleEncoding('win32', false, run).prepare()();
    expect(calls).toBe(0);
  });

  test('tolerates console access failures and unrecognised output', () => {
    const fails = (): string => { throw new Error('No console'); };
    expect(() => new ConsoleEncoding('win32', true, fails).prepare()()).not.toThrow();
    const commands: Array<string | undefined> = [];
    const restore = new ConsoleEncoding('win32', true, codePage => {
      commands.push(codePage);
      return 'No active code page reported';
    }).prepare();
    restore();
    expect(commands).toEqual([undefined]);
  });

  test('does not block shutdown when restoring the previous code page fails', () => {
    const restore = new ConsoleEncoding('win32', true, codePage => {
      if (codePage === '850') throw new Error('Console has closed');
      return codePage === undefined ? 'Page: 850' : 'Page: 65001';
    }).prepare();
    expect(restore).not.toThrow();
  });
});
