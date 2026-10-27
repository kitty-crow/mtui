import type { SensorSetupProvider } from '../collectors/contracts/SensorSetupProvider.ts';
import { PlatformFactory } from './PlatformFactory.ts';

/** One setup entry point shared by builds and the CLI on every supported host. */
export class SensorSetup {
  constructor(private readonly provider: SensorSetupProvider = new PlatformFactory().sensorSetup()) {}
  public run(): Promise<void> { return this.provider.run(); }
}
