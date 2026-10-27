import { expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { hardwareScript } from '../src/collectors/windows/HardwareScript.ts';
import { LineWorker } from '../src/collectors/windows/LineWorker.ts';
import { PowerShell, powershellArguments, powershellLiteral } from '../src/collectors/windows/PowerShell.ts';
import { WindowsSensorMapper } from '../src/collectors/windows/WindowsSensorMapper.ts';
import { archiveScript } from '../src/collectors/windows/ArchiveScript.ts';

const executable = process.platform === 'win32' ? 'powershell.exe' : process.env['MTUI_TEST_POWERSHELL'];
const hostTest = executable === undefined ? test.skip : test;

hostTest('sensor archive extraction works with module auto-loading disabled and overwrites partial files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mtui-archive-'));
  const source = join(root, 'source');
  const destination = join(root, "Kitty's sensor files");
  const archive = join(root, 'library.zip');
  const shell = new PowerShell(executable ?? 'powershell.exe');
  try {
    await mkdir(join(source, 'nested'), { recursive: true });
    await writeFile(join(source, 'library.dll'), 'library data');
    await writeFile(join(source, 'nested', 'dependency.dll'), 'dependency data');
    await shell.run(`[void][Reflection.Assembly]::LoadWithPartialName('System.IO.Compression.FileSystem');[IO.Compression.ZipFile]::CreateFromDirectory(${powershellLiteral(source)},${powershellLiteral(archive)})`);
    await mkdir(destination);
    await writeFile(join(destination, 'library.dll'), 'partial');
    await shell.run(`$PSModuleAutoLoadingPreference='None';${archiveScript(archive, destination)}`, 'Extracting LibreHardwareMonitor');
    expect(await readFile(join(destination, 'library.dll'), 'utf8')).toBe('library data');
    expect(await readFile(join(destination, 'nested', 'dependency.dll'), 'utf8')).toBe('dependency data');
    // Inject an escaping entry to verify that extraction cannot write outside its destination.
    await shell.run(`[void][Reflection.Assembly]::LoadWithPartialName('System.IO.Compression.FileSystem');$zip=[IO.Compression.ZipFile]::Open(${powershellLiteral(archive)},[IO.Compression.ZipArchiveMode]::Update);try{[void]$zip.CreateEntry('../outside.dll')}finally{$zip.Dispose()}`);
    await expect(shell.run(archiveScript(archive, destination), 'Extracting LibreHardwareMonitor')).rejects.toThrow('invalid destination path');
  } finally { await rm(root, { recursive: true, force: true }); }
}, 20_000);

hostTest('setup retains PowerShell exceptions and identifies the failed operation over pipes', async () => {
  const shell = new PowerShell(executable ?? 'powershell.exe');
  expect(await shell.run("[Console]::Out.Write('True')", 'Checking permissions')).toBe('True');
  await expect(shell.run("throw 'Archive destination is locked'", 'Extracting LibreHardwareMonitor')).rejects.toThrow('Extracting LibreHardwareMonitor: Archive destination is locked');
});

hostTest('PowerShell parses the production sensor host', async () => {
  const parser = `$tokens=$null;$errors=$null;[void][System.Management.Automation.Language.Parser]::ParseInput(${powershellLiteral(hardwareScript)},[ref]$tokens,[ref]$errors);if($errors.Count){throw ($errors | Out-String)}`;
  const result = await promisify(execFile)(executable ?? 'powershell.exe', powershellArguments(parser), { timeout: 15_000 });
  expect(result.stderr.trim()).toBe('');
});

hostTest('PowerShell host updates nested hardware, emits JSON, and closes handles on EOF', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mtui-host-'));
  const marker = join(directory, 'closed');
  const start = hardwareScript.indexOf('  $admin = ');
  const end = hardwareScript.indexOf('  $computer.IsCpuEnabled');
  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  // Replace only the privileged hardware construction; run the production traversal and protocol.
  const fixture = String.raw`
  $script:marker = MARKER
  function New-TestHardware($name, $type, $sensors, $children) {
    $node = [pscustomobject]@{ Name=$name; HardwareType=$type; Sensors=$sensors; SubHardware=$children }
    $node | Add-Member -MemberType ScriptMethod -Name Update -Value { }
    return $node
  }
  $cpu = New-TestHardware 'Example CPU' 'Cpu' @(
    [pscustomobject]@{ Identifier='/cpu/0/temperature/0'; Name='CPU Package'; SensorType='Temperature'; Value=51.5 },
    [pscustomobject]@{ Identifier='/cpu/0/load/0'; Name='CPU load'; SensorType='Load'; Value=12 }
  ) @()
  $chip = New-TestHardware 'Super IO' 'SuperIO' @(
    [pscustomobject]@{ Identifier='/lpc/fan/0'; Name='Chassis fan'; SensorType='Fan'; Value=0 },
    [pscustomobject]@{ Identifier='/lpc/temperature/0'; Name='Board'; SensorType='Temperature'; Value=35 }
  ) @()
  $board = New-TestHardware 'Example board' 'Motherboard' @() @($chip)
  $computer = [pscustomobject]@{
    Hardware=@($cpu,$board); IsCpuEnabled=$false; IsMotherboardEnabled=$false
    IsMemoryEnabled=$false; IsGpuEnabled=$false; IsControllerEnabled=$false
  }
  $computer | Add-Member -MemberType ScriptMethod -Name Open -Value { }
  $computer | Add-Member -MemberType ScriptMethod -Name Close -Value { [IO.File]::WriteAllText($script:marker,'closed') }
`.replace('MARKER', powershellLiteral(marker));
  const script = hardwareScript.slice(0, start) + fixture + hardwareScript.slice(end);
  const worker = new LineWorker(executable ?? 'powershell.exe', powershellArguments(script), directory);
  try {
    const packet = await worker.read() as { sensors?: unknown; error?: unknown };
    expect(packet.error).toBeUndefined();
    expect(new WindowsSensorMapper().map(packet.sensors, 'test')).toMatchObject([
      { label: 'CPU Package', component: 'cpu', value: 51.5 },
      { label: 'Chassis fan', device: 'Super IO', unit: 'RPM', value: 0 },
      { label: 'Board', value: 35 },
    ]);
    expect(await worker.read()).toEqual(packet);
    worker.close();
    let closed = '';
    for (let attempt = 0; attempt < 40; attempt++) {
      closed = await readFile(marker, 'utf8').catch(() => '');
      if (closed === 'closed') break;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    expect(closed).toBe('closed');
  } finally { worker.close(); await rm(directory, { recursive: true, force: true }); }
}, 15_000);
