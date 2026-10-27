import { readdir, readFile, realpath } from 'node:fs/promises';

/** Read-only filesystem boundary used by Linux hardware adapters. */
export interface FileAccess {
  list(path: string): Promise<string[]>;
  text(path: string): Promise<string | null>;
  resolve(path: string): Promise<string | null>;
}

export class NativeFiles implements FileAccess {
  public async list(path: string): Promise<string[]> { return readdir(path).catch(() => []); }
  public async text(path: string): Promise<string | null> { return readFile(path, 'utf8').then(text => text.trim()).catch(() => null); }
  public async resolve(path: string): Promise<string | null> { return realpath(path).catch(() => null); }
}

export function numericText(text: string | null): number | null {
  if (text === null || text === '') return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}
