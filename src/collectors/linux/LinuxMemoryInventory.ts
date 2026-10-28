import type { MemoryInventoryResult, MemoryInventorySource } from '../contracts/MemoryInventorySource.ts';
import type { CommandRunner } from '../native/CommandRunner.ts';
import { DmiMemoryParser } from './DmiMemoryParser.ts';

/** Queries firmware read-only; sudo never prompts or opens an elevation UI. */
export class LinuxMemoryInventory implements MemoryInventorySource {
  constructor(private readonly runner: CommandRunner) {}

  public async read(): Promise<MemoryInventoryResult> {
    const commands: readonly [string, readonly string[]][] = [
      ['dmidecode', ['--type', '17']],
      ['/usr/sbin/dmidecode', ['--type', '17']],
      ['sudo', ['-n', '--', '/usr/sbin/dmidecode', '--type', '17']],
    ];
    for (const [executable, args] of commands) {
      const output = await this.runner.run(executable, args).catch(() => '');
      const modules = new DmiMemoryParser().parse(output);
      if (modules.length > 0) return { modules, message: null };
    }
    return { modules: [], message: 'DIMM inventory unavailable. Install dmidecode and authorise firmware reads with sudo -v before launching. Firmware or virtual machines may omit module details.' };
  }
}
