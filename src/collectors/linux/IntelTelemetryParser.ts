import { nonNegative, percentage, positive } from '../shared/normalise.ts';

export interface IntelSample {
  readonly usage: number | null;
  readonly coreClock: number | null;
  readonly power: number | null;
}

/** Reads complete JSON frames, including a stream interrupted before its closing ]. */
export class IntelTelemetryParser {
  public parse(text: string): IntelSample | null {
    const frames = this.frames(text);
    // Discard the startup frame and require a subsequent measured interval.
    if (frames.length < 2) return null;
    const sample = this.object(frames.at(-1));
    const engines = Object.values(this.object(sample['engines'])).map(engine => percentage(this.number(this.object(engine)['busy']))).filter(value => value !== null);
    const frequency = this.object(sample['frequency']);
    const power = this.object(sample['power']);
    return {
      usage: engines.length === 0 ? null : Math.max(...engines),
      coreClock: frequency['unit'] === 'MHz' ? positive(this.number(frequency['actual'])) : null,
      power: power['unit'] === 'W' ? nonNegative(this.number(power['GPU'])) : null,
    };
  }

  private frames(text: string): readonly unknown[] {
    const frames: unknown[] = [];
    let depth = 0;
    let start = 0;
    let quoted = false;
    let escaped = false;
    for (let index = 0; index < text.length; index++) {
      const char = text[index];
      if (escaped) { escaped = false; continue; }
      if (quoted && char === '\\') { escaped = true; continue; }
      if (char === '"') { quoted = !quoted; continue; }
      if (quoted) continue;
      if (char === '{' && depth++ === 0) start = index;
      if (char !== '}' || depth === 0) continue;
      depth--;
      if (depth !== 0) continue;
      try { frames.push(JSON.parse(text.slice(start, index + 1)) as unknown); }
      catch { return []; }
    }
    return frames;
  }

  private object(value: unknown): Readonly<Record<string, unknown>> {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }

  private number(value: unknown): number | null { return typeof value === 'number' && Number.isFinite(value) ? value : null; }
}
