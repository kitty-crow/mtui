/** Units accompany scalar endpoints; compound objects document units in /api. */
export class MetricUnits {
  public forPath(resource: string, segments: readonly string[]): string | null {
    const last = segments.at(-1) ?? '';
    if (/^(temp|temperature|maxTemperature|memoryTemperature|coreTemperatures)$/.test(last)) return '°C';
    if (/^(usage|user|system|memoryUsage|fan|fanPercent)$/.test(last)) return '%';
    if (resource === 'proc' && last === 'speed') return 'GHz';
    if (resource === 'ram' && last === 'transferRate') return 'MT/s';
    if (/^(coreClock|memoryClock|clockSpeed)$/.test(last)) return 'MHz';
    if (/^(power|powerLimit)$/.test(last)) return 'W';
    if (resource === 'ram' && /^(total|active|available|free|cached|used|swapTotal|swapUsed|size)$/.test(last)) return 'bytes';
    if (resource === 'gpu' && /^(memoryTotal|memoryUsed|total|used)$/.test(last)) return 'bytes';
    return null;
  }
}
