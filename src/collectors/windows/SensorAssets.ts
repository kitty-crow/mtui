import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { PowerShell } from './PowerShell.ts';
import { archiveScript } from './ArchiveScript.ts';

export interface SensorDownload { readonly url: string; readonly sha256: string }
type AssetFetch = (url: string, init: RequestInit) => Promise<Response>;
export const sensorLibrary: SensorDownload = {
  url: 'https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases/download/v0.9.6/LibreHardwareMonitor.zip',
  sha256: '086d9f1b5a99e643edc2cfaaac16051685b551e4c5ac0b32a57c58c0e529c001',
};
export const sensorDriver: SensorDownload = {
  url: 'https://github.com/namazso/PawnIO.Setup/releases/download/2.2.0/PawnIO_setup.exe',
  sha256: '1f519a22e47187f70a1379a48ca604981c4fcf694f4e65b734aaa74a9fba3032',
};

/** Pins official packages and verifies their bytes before extraction or execution. */
export class SensorAssets {
  public readonly root: string;
  private pending: Promise<string> | null = null;

  constructor(private readonly shell: Pick<PowerShell, 'run'> = new PowerShell(), private readonly download: AssetFetch = fetch, root?: string) {
    this.root = root ?? join(process.env['LOCALAPPDATA'] ?? homedir(), 'mTUI', 'sensors', 'lhm-0.9.6');
  }

  public library(): Promise<string> {
    this.pending ??= this.prepare().catch(error => { this.pending = null; throw error; });
    return this.pending;
  }

  public async driver(): Promise<string> {
    const path = join(this.root, 'PawnIO-2.2.0-setup.exe');
    await this.verifiedDownload(sensorDriver, path);
    return path;
  }

  public verify(bytes: Uint8Array, expected: string): void {
    if (createHash('sha256').update(bytes).digest('hex') !== expected) throw new Error('Sensor package integrity check failed');
  }

  private async prepare(): Promise<string> {
    const library = join(this.root, 'LibreHardwareMonitorLib.dll');
    const ready = await access(join(this.root, '.ready')).then(() => true, () => false);
    const exists = await access(library).then(() => true, () => false);
    if (ready && exists) return this.root;
    const archive = join(this.root, 'LibreHardwareMonitor-0.9.6.zip');
    await this.verifiedDownload(sensorLibrary, archive);
    await this.shell.run(archiveScript(archive, this.root), 'Extracting LibreHardwareMonitor');
    await access(library);
    await writeFile(join(this.root, '.ready'), sensorLibrary.sha256, 'utf8');
    return this.root;
  }

  private async verifiedDownload(asset: SensorDownload, path: string): Promise<void> {
    const cached = await readFile(path).catch(() => null);
    if (cached !== null && createHash('sha256').update(cached).digest('hex') === asset.sha256) return;
    const response = await this.download(asset.url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Sensor package download failed (HTTP ${response.status}); retry --setup-sensors`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    this.verify(bytes, asset.sha256);
    await mkdir(this.root, { recursive: true });
    await writeFile(path, bytes);
  }
}
