import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ProductionPlugin } from './ProductionPlugin.mts';

/** Builds one self-contained executable for the current operating system. */
export class NativeBuilder {
  public async build(): Promise<string> {
    await mkdir('dist', { recursive: true });
    const outfile = join('dist', process.platform === 'win32' ? 'mtui.exe' : 'mtui');
    const result = await Bun.build({ entrypoints: ['src/main.ts'], target: 'bun', compile: { outfile }, minify: true, define: { 'process.env.NODE_ENV': '"production"', 'process.env.DEV': '"false"' }, plugins: [new ProductionPlugin().create()] });
    if (!result.success) throw new AggregateError(result.logs, 'The executable could not be built');
    return outfile;
  }
}
