import { SensorSetup } from '../../src/application/SensorSetup.ts';

/** Every local build runs host sensor setup; artifact-only builds can skip preparation. */
export class SensorBuildSetup {
  constructor(private readonly setup: Pick<SensorSetup, 'run'> = new SensorSetup()) {}

  public async run(args: readonly string[]): Promise<void> {
    const unknown = args.find(arg => arg !== '--skip-sensor-setup');
    if (unknown !== undefined) throw new Error(`Unknown build option: ${unknown}`);
    if (args.includes('--skip-sensor-setup')) return;
    console.log('Preparing host hardware sensors as part of the build.');
    await this.setup.run();
  }
}
