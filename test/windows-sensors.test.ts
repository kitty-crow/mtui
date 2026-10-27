import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { mkdtemp, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { NativeWindowsSensors } from '../src/collectors/windows/NativeWindowsSensors.ts';
import { WindowsSensorBackend } from '../src/collectors/windows/WindowsSensorBackend.ts';
import { LineWorker } from '../src/collectors/windows/LineWorker.ts';
import { SensorAssets } from '../src/collectors/windows/SensorAssets.ts';
import { powershellArguments, powershellLiteral, powershellFailure } from '../src/collectors/windows/PowerShell.ts';
import { OptionParser } from '../src/cli/Options.ts';

const packet = { sensors: [
  { Identifier: '/amdcpu/0/temperature/0', Name: 'CPU (Tctl/Tdie)', Parent: 'Example CPU', SensorType: 'Temperature', Value: 54, Component: 'cpu' },
  { Identifier: '/lpc/example/fan/0', Name: 'Chassis fan', Parent: 'Example board', SensorType: 'Fan', Value: 0 },
  { Identifier: '/lpc/example/temperature/0', Name: 'Motherboard', Parent: 'Example board', SensorType: 'Temperature', Value: 35 },
] };

describe('integrated Windows hardware reader', () => {
  test('maps CPU and motherboard channels without a WMI provider', async () => {
    let closed = false;
    let started = 0;
    const source = new NativeWindowsSensors({ library: async () => 'sensor-library' }, directory => {
      expect(directory).toBe('sensor-library');
      started++;
      return { read: async () => packet, close: () => { closed = true; } };
    });
    expect(await source.read()).toMatchObject([
      { component: 'cpu', value: 54, source: 'LibreHardwareMonitor library' },
      { device: 'Example board', unit: 'RPM', value: 0 },
      { label: 'Motherboard', value: 35 },
    ]);
    await source.read();
    expect(started).toBe(1);
    source.close();
    expect(closed).toBe(true);
    await expect(source.read()).rejects.toThrow('closed');
  });
  test('reports actionable helper errors and rejects malformed responses', async () => {
    const responses: unknown[] = [{ error: 'Run mtui.exe --setup-sensors once as administrator.' }, null, { sensors: 'wrong type' }];
    const source = new NativeWindowsSensors({ library: async () => '.' }, () => ({ read: async () => responses.shift(), close: () => {} }));
    await expect(source.read()).rejects.toThrow('--setup-sensors');
    await expect(source.read()).rejects.toThrow('invalid');
    await expect(source.read()).rejects.toThrow('sensor list');
    source.close();
  });
  test('does not spawn after being closed during dependency preparation', async () => {
    let ready: (directory: string) => void = () => {};
    const preparation = new Promise<string>(resolve => { ready = resolve; });
    let starts = 0;
    const source = new NativeWindowsSensors({ library: () => preparation }, () => {
      starts++;
      return { read: async () => packet, close: () => {} };
    });
    const pending = source.read();
    source.close();
    ready('.');
    await expect(pending).rejects.toThrow('closed');
    expect(starts).toBe(0);
  });
  test('falls back from a missing publisher and closes both sources', async () => {
    let probes = 0;
    let reads = 0;
    let closes = 0;
    const source = new WindowsSensorBackend(
      { read: async () => { probes++; throw new Error('No WMI'); }, close: () => { closes++; } },
      { read: async () => { reads++; return []; }, close: () => { closes++; } },
    );
    await source.read();
    await source.read();
    expect(probes).toBe(1);
    expect(reads).toBe(2);
    source.close();
    expect(closes).toBe(2);
  });
  test('uses a working publisher without launching or downloading a helper', async () => {
    const source = new WindowsSensorBackend(
      { read: async () => [{ id: 'sensor', label: 'CPU', device: 'CPU', value: 40, unit: '°C', source: 'WMI' }] },
      { read: async () => { throw new Error('Native reader should not start'); } },
    );
    expect((await source.read())[0]?.value).toBe(40);
  });
});

describe('headless worker transport', () => {
  test('coalesces requests and accepts chunked JSON responses from a persistent child', async () => {
    const script = `const r=require('node:readline').createInterface({input:process.stdin});let count=0;r.on('line',()=>{process.stdout.write('{"count":');setTimeout(()=>console.log(++count+'}'),2)});`;
    const worker = new LineWorker(process.execPath, ['-e', script], process.cwd());
    try {
      const first = worker.read();
      expect(worker.read()).toBe(first);
      expect(await first).toEqual({ count: 1 });
      expect(await worker.read()).toEqual({ count: 2 });
    } finally { worker.close(); }
    await expect(worker.read()).rejects.toThrow('closed');
  });
  test('bounds a stalled helper and terminates it', async () => {
    const worker = new LineWorker(process.execPath, ['-e', 'setInterval(()=>{},1000)'], process.cwd(), 100);
    try { await expect(worker.read()).rejects.toThrow('timed out'); } finally { worker.close(); }
  });
  test('reports a helper exit without dumping its command line', async () => {
    const worker = new LineWorker(process.execPath, ['-e', 'process.exit(2)'], process.cwd());
    try { await expect(worker.read()).rejects.toThrow('exited before'); } finally { worker.close(); }
  });
});

describe('sensor dependency preparation', () => {
  test('preserves the failing step and native diagnostic without exposing the full command', () => {
    expect(powershellFailure({ stderr: 'Access to library.dll is denied', message: 'Command failed: powershell.exe encoded-script' }, 'Extracting LibreHardwareMonitor').message).toBe('Extracting LibreHardwareMonitor: Access to library.dll is denied');
    expect(powershellFailure({ killed: true }, 'Installing PawnIO').message).toContain('timed out');
    expect(powershellFailure({ code: 'ENOENT' }, 'Setup').message).toContain('could not be found');
    expect(powershellFailure({ code: 5 }, 'Setup').message).toContain('code 5');
  });
  test('rejects a corrupted download before writing or executing it', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mtui-sensor-integrity-'));
    let commands = 0;
    const assets = new SensorAssets({ run: async () => { commands++; return ''; } }, async () => new Response('corrupt package'), root);
    try {
      await expect(assets.library()).rejects.toThrow('integrity');
      expect(commands).toBe(0);
      expect(await access(join(root, 'LibreHardwareMonitor-0.9.6.zip')).then(() => true, () => false)).toBe(false);
      const bytes = new TextEncoder().encode('verified data');
      expect(() => assets.verify(bytes, createHash('sha256').update(bytes).digest('hex'))).not.toThrow();
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  test('encodes scripts and quotes Windows paths without shell expansion', () => {
    const script = "Write-Output 'a path with spaces'";
    const args = powershellArguments(script);
    expect(args.slice(0, 4)).toEqual(['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand']);
    expect(Buffer.from(args[4] ?? '', 'base64').toString('utf16le')).toBe(script);
    expect(powershellLiteral("C:\\Kitty's tools\\sensor.dll")).toBe("'C:\\Kitty''s tools\\sensor.dll'");
  });
  test('setup is explicit and cannot be combined with remote or monitoring modes', () => {
    const parser = new OptionParser();
    expect(parser.parse([]).setupSensors).toBe(false);
    expect(parser.parse(['--setup-sensors']).setupSensors).toBe(true);
    expect(() => parser.parse(['--setup-sensors', '--serve'])).toThrow('separate operating mode');
    expect(() => parser.parse(['--setup-sensors', '--connect', 'http://example.test'])).toThrow('separate operating mode');
  });
});
