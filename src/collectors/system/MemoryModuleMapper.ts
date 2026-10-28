import type { Systeminformation } from 'systeminformation';
import type { MemoryModule } from '../../domain/memory.ts';
import { positive } from '../shared/normalise.ts';

/** Rejects the library's aggregate fallback, which is not a physical DIMM. */
export class MemoryModuleMapper {
  public map(modules: readonly Systeminformation.MemLayoutData[]): readonly MemoryModule[] {
    return modules.filter(module => module.size > 0 && this.identified(module)).map((module, index) => ({
      bank: module.bank || `Module ${index + 1}`, type: module.type || 'Unknown', size: module.size,
      clockSpeed: positive(module.clockSpeed), manufacturer: module.manufacturer || 'Unknown',
      transferRate: /DDR/i.test(module.type) ? positive(module.clockSpeed) : null,
      formFactor: module.formFactor || 'Unknown', ecc: module.ecc ?? null,
    }));
  }

  private identified(module: Systeminformation.MemLayoutData): boolean {
    return [module.bank, module.type, module.formFactor, module.manufacturer, module.partNum, module.serialNum]
      .some(value => Boolean(value?.trim())) || positive(module.clockSpeed) !== null;
  }
}
