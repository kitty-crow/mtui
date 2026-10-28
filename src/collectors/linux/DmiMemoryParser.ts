import type { MemoryModule } from '../../domain/memory.ts';

/** Parses firmware Memory Device records without grouping identical DIMMs. */
export class DmiMemoryParser {
  public parse(text: string): readonly MemoryModule[] {
    return text.split(/^Memory Device\s*$/m).slice(1).flatMap(record => this.device(record));
  }

  private device(record: string): readonly MemoryModule[] {
    const fields = new Map(record.split('\n').flatMap(line => {
      const match = /^\s*([^:]+):\s*(.*?)\s*$/.exec(line);
      return match ? [[match[1]?.trim() ?? '', match[2] ?? ''] as const] : [];
    }));
    const size = /^(\d+)\s+(kB|MB|GB|TB)$/i.exec(fields.get('Size') ?? '');
    if (size === null) return [];
    const unit = { kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3, tb: 1024 ** 4 }[size[2]?.toLowerCase() ?? ''] ?? 0;
    const bytes = Number(size[1]) * unit;
    if (bytes <= 0) return [];
    const dataWidth = this.number(fields.get('Data Width'));
    const totalWidth = this.number(fields.get('Total Width'));
    const speed = this.number(fields.get('Configured Memory Speed')) ?? this.number(fields.get('Configured Clock Speed')) ?? this.number(fields.get('Speed'));
    return [{
      bank: this.label(fields.get('Locator')) ?? this.label(fields.get('Bank Locator')) ?? 'Unknown bank',
      size: bytes, type: this.label(fields.get('Type')) ?? 'Unknown',
      clockSpeed: speed, transferRate: /DDR/i.test(fields.get('Type') ?? '') ? speed : null,
      manufacturer: this.label(fields.get('Manufacturer')) ?? 'Unknown',
      formFactor: this.label(fields.get('Form Factor')) ?? 'Unknown',
      ecc: dataWidth === null || totalWidth === null ? null : totalWidth > dataWidth,
    }];
  }

  private number(text: string | undefined): number | null {
    const value = Number.parseFloat(text ?? '');
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  private label(text: string | undefined): string | null {
    return !text || /^(unknown|not specified|other)$/i.test(text) ? null : text;
  }
}
