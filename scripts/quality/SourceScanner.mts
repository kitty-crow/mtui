import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

/** Scans maintained files without requiring Git metadata or a particular shell. */
export class SourceScanner {
  private readonly ignored = new Set(['.git', 'node_modules', 'dist', 'coverage']);

  public async files(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const groups = await Promise.all(entries.map(entry => {
      const path = join(directory, entry.name);
      if (entry.name.includes('.bun-build.')) return Promise.resolve([]);
      if (!entry.isDirectory()) return Promise.resolve([path]);
      return this.ignored.has(entry.name) ? Promise.resolve([]) : this.files(path);
    }));
    return groups.flat();
  }
}
