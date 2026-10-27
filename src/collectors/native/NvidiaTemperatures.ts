import { temperature } from '../shared/normalise.ts';
import type { CommandRunner } from './CommandRunner.ts';

export interface NvidiaThermalSample {
  readonly bus: string;
  readonly memory: number | null;
}

/** Uses the documented XML query so unsupported memory sensors cannot break GPU counters. */
export class NvidiaTemperatures {
  constructor(private readonly runner: CommandRunner) {}

  public async read(executable: string): Promise<readonly NvidiaThermalSample[]> {
    try {
      const output = await this.runner.run(executable, ['-q', '-d', 'TEMPERATURE', '-x']);
      return [...output.matchAll(/<gpu\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/gpu>/g)].map(match => ({
        bus: match[1] ?? '',
        memory: temperature(Number(match[2]?.match(/<memory_temp>\s*([^<]+)<\/memory_temp>/)?.[1]?.replace(/\s*C\s*$/, ''))),
      }));
    } catch { return []; }
  }
}
