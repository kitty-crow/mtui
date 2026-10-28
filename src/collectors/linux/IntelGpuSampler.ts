import type { CommandRunner } from '../native/CommandRunner.ts';

export interface IntelSampleSource { read(card: string): Promise<string> }

/** Bounded PMU sampling supports tool versions without a sample-count option. */
export class IntelGpuSampler implements IntelSampleSource {
  constructor(private readonly runner: CommandRunner) {}

  public async read(card: string): Promise<string> {
    if (!/^card\d+$/.test(card)) throw new Error('Invalid DRM card.');
    const args = ['--signal=INT', '--kill-after=0.2s', '0.8s', 'intel_gpu_top', '-J', '-s', '200', '-o', '-', '-d', `drm:/dev/dri/${card}`];
    const direct = await this.runner.run('timeout', args).catch(() => '');
    if (direct.trim() !== '') return direct;
    return this.runner.run('sudo', ['-n', '--', 'timeout', ...args]);
  }
}
