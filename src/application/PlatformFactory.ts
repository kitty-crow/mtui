import { platform } from 'node:os';
import { NativeFiles } from '../collectors/native/FileAccess.ts';
import { NativeCommandRunner } from '../collectors/native/CommandRunner.ts';
import { LinuxGraphics } from '../collectors/native/LinuxGraphics.ts';
import { LinuxSensors } from '../collectors/native/LinuxSensors.ts';
import { WindowsSensors } from '../collectors/native/WindowsSensors.ts';
import { NvidiaTelemetry } from '../collectors/native/NvidiaTelemetry.ts';
import { EmptySensorSource, type SensorSource } from '../collectors/native/SensorSource.ts';

/** Platform branching is confined to composition, away from screens and models. */
export class PlatformFactory {
  private readonly files = new NativeFiles();
  constructor(private readonly hostPlatform: string = platform()) {}

  public sensors(): SensorSource {
    if (this.hostPlatform === 'linux') return new LinuxSensors(this.files);
    if (this.hostPlatform === 'win32') return new WindowsSensors(new NativeCommandRunner());
    return new EmptySensorSource();
  }

  public graphics(): LinuxGraphics | null {
    return this.hostPlatform === 'linux' ? new LinuxGraphics(this.files) : null;
  }

  public nvidia(): NvidiaTelemetry { return new NvidiaTelemetry(new NativeCommandRunner()); }
}
