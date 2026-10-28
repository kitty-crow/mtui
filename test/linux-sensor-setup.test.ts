import { describe, expect, test } from 'bun:test';
import { LinuxSensorSetup, type LinuxSetupHost } from '../src/collectors/linux/LinuxSensorSetup.ts';

const intelFiles = {
  list: async () => ['card0', 'renderD128'],
  text: async (_path: string) => '0x8086',
};

describe('Linux Intel telemetry setup', () => {
  test('installs missing Intel tools through the available distribution manager', async () => {
    const attempts: { executable: string; args: readonly string[] }[] = [];
    const available = new Set(['sudo', 'apt-get', 'timeout']);
    const host: LinuxSetupHost = {
      available: command => available.has(command),
      root: () => false,
      run: async (executable, args) => { attempts.push({ executable, args }); return 0; },
    };
    let nativeChecks = 0;
    const setup = new LinuxSensorSetup({ run: async () => { nativeChecks++; } }, intelFiles, host);
    await setup.run();
    expect(attempts).toEqual([{ executable: 'sudo', args: ['--', 'apt-get', 'install', '-y', 'intel-gpu-tools'] }]);
    expect(nativeChecks).toBe(1);
  });

  test('uses Fedora package names and does not ask sudo when root', async () => {
    const attempts: string[][] = [];
    const available = new Set(['dnf', 'timeout']);
    const host: LinuxSetupHost = {
      available: command => available.has(command),
      root: () => true,
      run: async (executable, args) => { attempts.push([executable, ...args]); return 0; },
    };
    await new LinuxSensorSetup({ run: async () => {} }, intelFiles, host).run();
    expect(attempts).toEqual([['dnf', 'install', '-y', 'igt-gpu-tools']]);
  });

  test('does not install when the DRM vendor is not Intel or tools exist', async () => {
    const attempts: string[] = [];
    const host: LinuxSetupHost = {
      available: () => true,
      root: () => true,
      run: async executable => { attempts.push(executable); return 0; },
    };
    await new LinuxSensorSetup({ run: async () => {} }, {
      list: async () => ['card0'],
      text: async () => '0x1002',
    }, host).run();
    await new LinuxSensorSetup({ run: async () => {} }, intelFiles, host).run();
    expect(attempts).toEqual([]);
  });

  test('missing privileges or failed optional packages do not block native sensor checks', async () => {
    let checks = 0;
    const host: LinuxSetupHost = {
      available: command => command === 'apt-get',
      root: () => false,
      run: async () => { throw new Error('Must not install without sudo'); },
    };
    await new LinuxSensorSetup({ run: async () => { checks++; } }, intelFiles, host).run();
    const failed: LinuxSetupHost = {
      available: command => command === 'apt-get' || command === 'sudo',
      root: () => false,
      run: async () => 1,
    };
    await new LinuxSensorSetup({ run: async () => { checks++; } }, intelFiles, failed).run();
    expect(checks).toBe(2);
  });
});
