import { z } from 'zod';
import type { ApiPayload } from '../api/resources/ApiPayload.ts';

const metric = z.number().finite().nullable();
const core = z.object({ id: z.number().int().nonnegative(), usage: metric, user: metric, system: metric, speed: metric });
const cpu = z.object({
  model: z.string(), manufacturer: z.string(), physicalCores: z.number().int().nonnegative(), logicalCores: z.number().int().nonnegative(),
  usage: metric, user: metric, system: metric, temperature: metric, maxTemperature: metric,
  coreTemperatures: z.array(z.number().finite()), speed: metric, cores: z.array(core).max(65_536),
});
const module = z.object({ bank: z.string(), type: z.string(), size: z.number().nonnegative(), clockSpeed: metric, transferRate: metric.default(null), manufacturer: z.string(), formFactor: z.string(), ecc: z.boolean().nullable() });
const memory = z.object({ total: z.number().nonnegative(), active: z.number().nonnegative(), available: z.number().nonnegative(), free: z.number().nonnegative(), cached: metric, swapTotal: z.number().nonnegative(), swapUsed: z.number().nonnegative(), modules: z.array(module).max(4096), inventoryMessage: z.string().nullable().default(null) });
const gpu = z.object({
  id: z.string(), model: z.string(), vendor: z.string(), bus: z.string(), driver: z.string(), sharedMemory: z.boolean(),
  usage: metric, memoryUsage: metric, memoryTotal: metric, memoryUsed: metric, temperature: metric,
  memoryTemperature: metric, fanPercent: metric, power: metric, powerLimit: metric, coreClock: metric, memoryClock: metric, telemetryMessage: z.string().nullable().optional(),
});
const sensor = z.object({ id: z.string(), label: z.string(), device: z.string(), value: metric, unit: z.enum(['°C', 'RPM', 'V', 'W', '%']), source: z.string(), component: z.enum(['cpu', 'gpu', 'other']).optional() });

function reading<T extends z.ZodType>(value: T) {
  return z.object({ value: value.nullable(), status: z.enum(['waiting', 'live', 'stale', 'unavailable']), updatedAt: metric, message: z.string().nullable() });
}

/** Remote data is validated before it enters the display or history buffers. */
export const payloadSchema: z.ZodType<ApiPayload> = z.object({
  schemaVersion: z.literal(1), product: z.literal('mTUI'), version: z.string(), demo: z.boolean(),
  intervalMs: z.number().positive(), paused: z.boolean(),
  host: z.object({ hostname: z.string(), platform: z.string(), release: z.string(), architecture: z.string() }),
  snapshot: z.object({
    sequence: z.number().int().nonnegative(), sampledAt: z.number().nonnegative(), uptime: z.number().nonnegative(),
    readings: z.object({ cpu: reading(cpu), memory: reading(memory), graphics: reading(z.array(gpu).max(4096)), sensors: reading(z.array(sensor).max(65_536)) }),
  }),
});
