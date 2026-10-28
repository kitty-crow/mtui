import type { CpuMetrics } from '../../domain/cpu.ts';
import type { GpuMetrics } from '../../domain/graphics.ts';
import type { MemoryMetrics } from '../../domain/memory.ts';
import type { SensorMetric } from '../../domain/sensors.ts';
import { CollectorRegistry } from '../../monitoring/CollectorRegistry.ts';
import { DemoCollector } from './DemoCollector.ts';

const GiB = 1024 ** 3;

/** A generic workstation scenario, labelled as simulated throughout the UI. */
export class DemoScenario {
  constructor(private readonly clock: () => number = Date.now) {}

  public register(registry: CollectorRegistry): void {
    registry.register('cpu', new DemoCollector('Demo processor', () => this.cpu()));
    registry.register('memory', new DemoCollector('Demo memory', () => this.memory()));
    registry.register('graphics', new DemoCollector('Demo graphics', () => this.graphics()));
    registry.register('sensors', new DemoCollector('Demo sensors', () => this.sensors()));
  }

  public cpu(): CpuMetrics {
    const usage = this.wave(42, 18);
    return {
      model: 'Example 8-core processor', manufacturer: 'Demo', physicalCores: 8, logicalCores: 16,
      usage, user: usage * 0.72, system: usage * 0.28, temperature: this.wave(58, 8), maxTemperature: 71,
      coreTemperatures: Array.from({ length: 8 }, (_, id) => this.wave(54, 9, id)), speed: this.wave(3.8, 0.4),
      cores: Array.from({ length: 16 }, (_, id) => ({ id, usage: this.wave(42, 28, id), user: this.wave(28, 15, id), system: 8, speed: this.wave(3.8, 0.4, id) })),
    };
  }

  public memory(): MemoryMetrics {
    const active = this.wave(14, 2) * GiB;
    return {
      total: 32 * GiB, active, available: 32 * GiB - active, free: 8 * GiB, cached: 10 * GiB,
      swapTotal: 8 * GiB, swapUsed: 0.3 * GiB,
      inventoryMessage: null,
      modules: Array.from({ length: 2 }, (_, id) => ({ bank: `DIMM ${id + 1}`, type: 'DDR5', size: 16 * GiB, clockSpeed: 5600, transferRate: 5600, manufacturer: 'Example', formFactor: 'DIMM', ecc: false })),
    };
  }

  public graphics(): readonly GpuMetrics[] {
    return [0, 1].map(id => ({
      id: `demo:${id}`, model: id === 0 ? 'Example Discrete GPU' : 'Example Integrated GPU', vendor: 'Demo',
      bus: `0000:0${id + 1}:00.0`, driver: 'Demo driver', sharedMemory: id === 1,
      usage: this.wave(id === 0 ? 72 : 18, 15, id), memoryUsage: id === 0 ? 62 : 15,
      memoryTotal: (id === 0 ? 12 : 4) * GiB, memoryUsed: (id === 0 ? 7.44 : 0.6) * GiB,
      temperature: this.wave(id === 0 ? 65 : 44, 7, id), memoryTemperature: id === 0 ? 74 : null,
      fanPercent: id === 0 ? this.wave(48, 8) : null, power: this.wave(id === 0 ? 165 : 18, 8, id),
      powerLimit: id === 0 ? 250 : 30, coreClock: id === 0 ? 1980 : 1200, memoryClock: id === 0 ? 7500 : null,
    }));
  }

  public sensors(): readonly SensorMetric[] {
    return [
      { id: 'demo:board', label: 'Mainboard', device: 'Example board', value: this.wave(36, 2), unit: '°C', source: 'Demo' },
      { id: 'demo:cpu-fan', label: 'Processor fan', device: 'Example board', value: this.wave(1120, 160), unit: 'RPM', source: 'Demo' },
      { id: 'demo:case-fan', label: 'Chassis fan', device: 'Example board', value: this.wave(810, 80), unit: 'RPM', source: 'Demo' },
      { id: 'demo:dimm', label: 'DIMM temperature', device: 'Example memory', value: this.wave(41, 3), unit: '°C', source: 'Demo' },
    ];
  }

  private wave(centre: number, amplitude: number, phase = 0): number {
    return centre + Math.sin(this.clock() / 8000 + phase) * amplitude;
  }
}
