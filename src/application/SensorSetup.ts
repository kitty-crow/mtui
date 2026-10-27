import { platform } from 'node:os';
import { SensorAssets } from '../collectors/windows/SensorAssets.ts';
import { PowerShell, powershellLiteral } from '../collectors/windows/PowerShell.ts';

/** Explicit one-time setup is the only path that installs the hardware-access driver. */
export class SensorSetup {
  public async run(): Promise<void> {
    if (platform() !== 'win32') throw new Error('--setup-sensors is for the Windows hardware reader; other platforms use their native providers');
    const shell = new PowerShell();
    const administrator = await shell.run('([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)', 'Checking administrator access');
    if (administrator !== 'True') throw new Error('Run --setup-sensors from an administrator terminal');
    console.log('Preparing LibreHardwareMonitor 0.9.6 and PawnIO 2.2.0 for headless sensor access.');
    const assets = new SensorAssets(shell);
    await assets.library();
    const driver = await assets.driver();
    const result = await shell.run(`$p=Start-Process -FilePath ${powershellLiteral(driver)} -ArgumentList '-install','-silent' -Wait -PassThru -NoNewWindow; [Console]::Out.Write($p.ExitCode)`, 'Installing PawnIO');
    if (result === '3010') { console.log('Sensor driver installed. Restart Windows before monitoring sensors.'); return; }
    if (result !== '0') throw new Error(`Sensor driver installation failed (exit ${result})`);
    console.log('Sensor support installed. Launch mTUI from an administrator terminal.');
  }
}
