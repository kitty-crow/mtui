import si from 'systeminformation';

/** Narrow injectable boundary around the portable hardware library. */
export type SystemApi = Pick<typeof si,
  'cpu' | 'currentLoad' | 'cpuCurrentSpeed' | 'cpuTemperature' | 'mem' | 'memLayout' | 'graphics'>;

export const systemApi: SystemApi = si;

export async function optional<T>(query: Promise<T>): Promise<T | null> {
  return query.catch(() => null);
}
