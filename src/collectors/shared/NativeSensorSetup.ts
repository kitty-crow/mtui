import type { SensorSetupProvider } from '../contracts/SensorSetupProvider.ts';
import type { SensorSource } from '../native/SensorSource.ts';
import { temperature } from './normalise.ts';

interface ThermalProbe { readonly main: number; readonly cores: readonly number[] }

/** Checks the availability of host-provided thermal and cooling channels. */
export class NativeSensorSetup implements SensorSetupProvider {
  constructor(private readonly source: SensorSource, private readonly thermal: () => Promise<ThermalProbe>) {}

  public async run(): Promise<void> {
    const samples = await Promise.allSettled([this.source.read(), this.thermal()]);
    const sensors = samples[0]?.status === 'fulfilled' ? samples[0].value : [];
    const thermal = samples[1]?.status === 'fulfilled' ? samples[1].value : null;
    const temperatures = sensors.filter(sensor => sensor.unit === '°C' && sensor.value !== null).length;
    const cooling = sensors.filter(sensor => sensor.unit === 'RPM' && sensor.value !== null).length;
    const cpu = temperature(thermal?.main) !== null || (thermal?.cores ?? []).some(value => temperature(value) !== null);
    console.log(`Native sensor check: ${temperatures} temperature channels, ${cooling} fan channels, CPU temperature ${cpu ? 'available' : 'unavailable'}.`);
    if (temperatures === 0 && cooling === 0 && !cpu) console.warn('No native thermal or cooling readings are accessible. Check hardware drivers and sensor permissions on this host.');
  }
}
