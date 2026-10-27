import { platform } from 'node:os';
import type { GpuMetrics } from '../../domain/graphics.ts';
import { mebibytes, nonNegative, percentage, positive, ratio, temperature } from '../shared/normalise.ts';
import type { CommandRunner } from './CommandRunner.ts';

interface NvidiaSample {
  readonly index: number;
  readonly name: string;
  readonly bus: string;
  readonly usage: number | null;
  readonly memoryTotal: number | null;
  readonly memoryUsed: number | null;
  readonly temperature: number | null;
  readonly fan: number | null;
  readonly power: number | null;
  readonly powerLimit: number | null;
  readonly coreClock: number | null;
  readonly memoryClock: number | null;
}

/** Direct NVIDIA telemetry fills fields that generic graphics enumeration omits. */
export class NvidiaTelemetry {
  constructor(private readonly runner: CommandRunner) {}

  public async enrich(gpus: readonly GpuMetrics[]): Promise<readonly GpuMetrics[]> {
    const samples = await this.read();
    return gpus.map((gpu, index) => this.merge(gpu, samples.find(sample => this.matches(sample, gpu, index))));
  }

  private async read(): Promise<readonly NvidiaSample[]> {
    const query = 'index,name,utilization.gpu,memory.total,memory.used,temperature.gpu,fan.speed,power.draw,power.limit,clocks.current.graphics,clocks.current.memory,pci.bus_id';
    let output: string;
    const executable = platform() === 'win32' ? 'nvidia-smi.exe' : 'nvidia-smi';
    try { output = await this.runner.run(executable, ['--query-gpu=' + query, '--format=csv,noheader,nounits']); } catch { return []; }
    return output.split(/\r?\n/).flatMap(line => this.parse(line));
  }

  private parse(line: string): NvidiaSample[] {
    const fields = line.split(',').map(field => field.trim());
    if (fields.length < 12) return [];
    const index = Number(fields[0]);
    if (!Number.isInteger(index)) return [];
    const number = (position: number): number | null => nonNegative(Number(fields[position]));
    return [{
      index, name: fields[1] ?? 'NVIDIA GPU', bus: fields[11] ?? 'Unknown', usage: percentage(number(2)),
      memoryTotal: mebibytes(number(3)), memoryUsed: mebibytes(number(4)), temperature: temperature(number(5)),
      fan: percentage(number(6)), power: number(7), powerLimit: positive(number(8)), coreClock: positive(number(9)), memoryClock: positive(number(10)),
    }];
  }

  private matches(sample: NvidiaSample, gpu: GpuMetrics, index: number): boolean {
    return this.clean(sample.bus) === this.clean(gpu.bus) || gpu.vendor.toLowerCase().includes('nvidia') && sample.index === index;
  }

  private merge(gpu: GpuMetrics, sample: NvidiaSample | undefined): GpuMetrics {
    if (sample === undefined) return gpu;
    const memoryTotal = sample.memoryTotal ?? gpu.memoryTotal;
    const memoryUsed = sample.memoryUsed ?? gpu.memoryUsed;
    return { ...gpu, model: gpu.model === 'Graphics adapter' ? sample.name : gpu.model, bus: gpu.bus === 'Unknown' ? sample.bus : gpu.bus, usage: sample.usage ?? gpu.usage, memoryTotal, memoryUsed, memoryUsage: ratio(memoryUsed, memoryTotal), temperature: sample.temperature ?? gpu.temperature, fanPercent: sample.fan ?? gpu.fanPercent, power: sample.power ?? gpu.power, powerLimit: sample.powerLimit ?? gpu.powerLimit, coreClock: sample.coreClock ?? gpu.coreClock, memoryClock: sample.memoryClock ?? gpu.memoryClock };
  }

  private clean(value: string): string { return value.toLowerCase().replace(/^0{4,8}:/, ''); }
}
