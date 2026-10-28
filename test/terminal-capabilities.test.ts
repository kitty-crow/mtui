import { describe, expect, test } from 'bun:test';
import { TerminalCapabilities } from '../src/ui/terminal/TerminalCapabilities.ts';

describe('terminal glyph compatibility', () => {
  test('uses safe ASCII by default in classic Windows PowerShell consoles', () => {
    expect(new TerminalCapabilities('win32', {}).requiresAscii()).toBe(true);
  });
  test('retains Unicode in modern terminals including elevated Windows Terminal', () => {
    expect(new TerminalCapabilities('win32', { WT_SESSION: 'elevated-session' }).requiresAscii()).toBe(false);
    expect(new TerminalCapabilities('win32', { TERM_PROGRAM: 'vscode' }).requiresAscii()).toBe(false);
    expect(new TerminalCapabilities('win32', { MSYSTEM: 'MINGW64' }).requiresAscii()).toBe(false);
  });
  test('never downgrades Linux or macOS terminals', () => {
    expect(new TerminalCapabilities('linux', {}).requiresAscii()).toBe(false);
    expect(new TerminalCapabilities('darwin', {}).requiresAscii()).toBe(false);
  });
  test('allows opting into Unicode on a legacy console', () => {
    expect(new TerminalCapabilities('win32', { MTUI_UNICODE: '1' }).requiresAscii()).toBe(false);
  });
});
