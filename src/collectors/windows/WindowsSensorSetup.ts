import type { SensorSetupProvider } from '../contracts/SensorSetupProvider.ts';
import { SensorAssets } from './SensorAssets.ts';
import { PowerShell, powershellLiteral } from './PowerShell.ts';

/** Prepares the managed library and retains any existing hardware-access driver. */
export class WindowsSensorSetup implements SensorSetupProvider {
  constructor(
    private readonly shell: Pick<PowerShell, 'run'> = new PowerShell(),
    private readonly assets: Pick<SensorAssets, 'library' | 'driver'> = new SensorAssets(),
  ) {}

  public async run(): Promise<void> {
    const administrator = await this.shell.run('([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)', 'Checking administrator access');
    if (administrator !== 'True') throw new Error('Sensor setup requires an administrator terminal on this host. For a build without setup, use bun run build --skip-sensor-setup');
    console.log('Preparing LibreHardwareMonitor 0.9.6 and PawnIO 2.2.0 for headless sensor access.');
    await this.assets.library();
    const installed = await this.shell.run("Test-Path -LiteralPath 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\PawnIO'", 'Checking PawnIO installation');
    if (installed === 'True') { console.log('Sensor library prepared; existing PawnIO installation retained.'); return; }
    const driver = await this.assets.driver();
    const result = await this.shell.run(`$p=Start-Process -FilePath ${powershellLiteral(driver)} -ArgumentList '-install','-silent' -Wait -PassThru -NoNewWindow; [Console]::Out.Write($p.ExitCode)`, 'Installing PawnIO');
    if (result === '3010') { console.log('Sensor driver installed. Restart the host before monitoring sensors.'); return; }
    if (result !== '0') throw new Error(`Sensor driver installation failed (exit ${result})`);
    console.log('Sensor support installed. Privileged readings require an administrator session.');
  }
}
