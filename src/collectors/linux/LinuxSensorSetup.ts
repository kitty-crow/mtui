import type { SensorSetupProvider } from '../contracts/SensorSetupProvider.ts';
import type { FileAccess } from '../native/FileAccess.ts';

export interface LinuxSetupHost {
  available(command: string): boolean;
  root(): boolean;
  run(command: string, args: readonly string[]): Promise<number>;
}

/** Only explicit setup can install optional hardware telemetry packages. */
export class NativeLinuxSetupHost implements LinuxSetupHost {
  public available(command: string): boolean { return Bun.which(command) !== null; }
  public root(): boolean { return process.getuid?.() === 0; }
  public async run(command: string, args: readonly string[]): Promise<number> {
    const child = Bun.spawn([command, ...args], { stdin: 'inherit', stdout: 'inherit', stderr: 'inherit' });
    return child.exited;
  }
}

/** Prepares Intel PMU tools when a real Intel DRM device is present. */
export class LinuxSensorSetup implements SensorSetupProvider {
  constructor(
    private readonly native: SensorSetupProvider,
    private readonly files: Pick<FileAccess, 'list' | 'text'>,
    private readonly host: LinuxSetupHost = new NativeLinuxSetupHost(),
  ) {}

  public async run(): Promise<void> {
    await this.prepareIntel();
    await this.native.run();
  }

  private async prepareIntel(): Promise<void> {
    const cards = (await this.files.list('/sys/class/drm')).filter(card => /^card\d+$/.test(card));
    const vendors = await Promise.all(cards.map(card => this.files.text(`/sys/class/drm/${card}/device/vendor`)));
    if (!vendors.some(vendor => vendor?.trim().toLowerCase() === '0x8086')) return;

    const missing = ['intel_gpu_top', 'timeout'].filter(command => !this.host.available(command));
    if (missing.length === 0) { console.log('Intel graphics telemetry tools are already installed.'); return; }

    const manager = this.packageManager();
    if (manager === null) { console.warn('Intel telemetry tools missing; no supported package manager was found.'); return; }
    const packages = missing.map(command => command === 'timeout' ? 'coreutils' : manager.intelPackage);
    const args = [...manager.installArgs, ...packages];
    const elevated = !this.host.root();
    if (elevated && !this.host.available('sudo')) { console.warn('Intel telemetry tool installation needs sudo on this host.'); return; }

    const executable = elevated ? 'sudo' : manager.command;
    const invocation = elevated ? ['--', manager.command, ...args] : args;
    console.log(`Installing Intel telemetry prerequisites: ${packages.join(', ')}`);
    const status = await this.host.run(executable, invocation).catch(() => -1);
    if (status !== 0) { console.warn('Optional Intel telemetry tools could not be installed; other sensor readings remain available.'); return; }
    console.log('Intel graphics telemetry prerequisites installed.');
  }

  private packageManager(): { command: string; installArgs: string[]; intelPackage: string } | null {
    if (this.host.available('apt-get')) return { command: 'apt-get', installArgs: ['install', '-y'], intelPackage: 'intel-gpu-tools' };
    if (this.host.available('dnf')) return { command: 'dnf', installArgs: ['install', '-y'], intelPackage: 'igt-gpu-tools' };
    if (this.host.available('pacman')) return { command: 'pacman', installArgs: ['-S', '--noconfirm', '--needed'], intelPackage: 'intel-gpu-tools' };
    return null;
  }
}
