import { describe, expect, test } from 'bun:test';
import { SensorBuildSetup } from '../scripts/build/SensorBuildSetup.mts';
import { SensorSetup } from '../src/application/SensorSetup.ts';
import { PlatformFactory } from '../src/application/PlatformFactory.ts';
import { NativeSensorSetup } from '../src/collectors/shared/NativeSensorSetup.ts';
import { LinuxSensorSetup } from '../src/collectors/linux/LinuxSensorSetup.ts';
import { WindowsSensorSetup } from '../src/collectors/windows/WindowsSensorSetup.ts';

describe('shared sensor setup', () => {
  test('the build and CLI delegate to the same injected host provider', async () => {
    let calls = 0;
    const setup = new SensorSetup({ run: async () => { calls++; } });
    await setup.run();
    await new SensorBuildSetup(setup).run([]);
    expect(calls).toBe(2);
  });
  test('explicit artifact builds skip setup and reject unknown flags', async () => {
    let calls = 0;
    const build = new SensorBuildSetup({ run: async () => { calls++; } });
    await build.run(['--skip-sensor-setup']);
    expect(calls).toBe(0);
    await expect(build.run(['--wrong'])).rejects.toThrow('Unknown build option');
  });
  test('selects Linux prerequisite preparation for Linux builds', () => {
    expect(new PlatformFactory('linux').sensorSetup()).toBeInstanceOf(LinuxSensorSetup);
  });
  test('selects native sensor checks on macOS', () => {
    expect(new PlatformFactory('darwin').sensorSetup()).toBeInstanceOf(NativeSensorSetup);
  });
  test('selects driver preparation only in the Windows adapter', () => {
    expect(new PlatformFactory('win32').sensorSetup()).toBeInstanceOf(WindowsSensorSetup);
  });
  test('native setup tolerates missing readings without claiming installation', async () => {
    const setup = new NativeSensorSetup({ read: async () => [] }, async () => ({ main: -1, cores: [] }));
    await expect(setup.run()).resolves.toBeUndefined();
  });
});

describe('driver setup idempotence', () => {
  test('retains an installed driver instead of reinstalling or downgrading it on each build', async () => {
    let prepared = 0;
    let downloaded = 0;
    const operations: string[] = [];
    const setup = new WindowsSensorSetup({ run: async (_script, operation) => { operations.push(operation ?? ''); return 'True'; } }, {
      library: async () => { prepared++; return '.'; },
      driver: async () => { downloaded++; return 'driver.exe'; },
    });
    await setup.run();
    expect(prepared).toBe(1);
    expect(downloaded).toBe(0);
    expect(operations).toEqual(['Checking administrator access', 'Checking PawnIO installation']);
  });
  test('does not download or install privileged components without administrator access', async () => {
    const setup = new WindowsSensorSetup({ run: async () => 'False' }, {
      library: async () => { throw new Error('Must not download'); },
      driver: async () => { throw new Error('Must not install'); },
    });
    await expect(setup.run()).rejects.toThrow('administrator terminal');
  });
});
