import type { BunPlugin } from 'bun';

/** Excludes Ink's optional development inspector from self-contained releases. */
export class ProductionPlugin {
  public create(): BunPlugin {
    return {
      name: 'ink-production',
      setup(builder) {
        builder.onLoad({ filter: /[/\\]ink[/\\]build[/\\]devtools\.js$/ }, () => ({ contents: 'export {};', loader: 'ts' }));
      },
    };
  }
}
