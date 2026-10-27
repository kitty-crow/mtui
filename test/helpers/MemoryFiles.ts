import type { FileAccess } from '../../src/collectors/native/FileAccess.ts';

export class MemoryFiles implements FileAccess {
  constructor(private readonly texts: Readonly<Record<string, string>>, private readonly lists: Readonly<Record<string, string[]>> = {}, private readonly links: Readonly<Record<string, string>> = {}) {}
  public async list(path: string): Promise<string[]> { return this.lists[path] ?? []; }
  public async text(path: string): Promise<string | null> { return this.texts[path] ?? null; }
  public async resolve(path: string): Promise<string | null> { return this.links[path] ?? null; }
}
