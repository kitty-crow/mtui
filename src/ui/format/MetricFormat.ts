/** Shared display units and safe, single-line labels for hardware-supplied text. */
export class MetricFormat {
  public static percent(value: number | null): string { return value === null ? 'N/A' : `${value.toFixed(1)}%`; }
  public static temperature(value: number | null): string { return value === null ? 'N/A' : `${value.toFixed(0)}°C`; }
  public static value(value: number | null, unit: string, digits = 0): string {
    return value === null ? 'N/A' : `${value.toFixed(digits)} ${unit}`;
  }

  public static bytes(value: number | null): string {
    if (value === null) return 'N/A';
    if (value === 0) return '0 B';
    const exponent = Math.min(4, Math.max(0, Math.floor(Math.log(value) / Math.log(1024))));
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    return `${(value / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent] ?? 'B'}`;
  }

  public static duration(seconds: number): string {
    const days = Math.floor(seconds / 86_400);
    const hours = Math.floor(seconds / 3600) % 24;
    const minutes = Math.floor(seconds / 60) % 60;
    return days > 0 ? `${days}d ${hours}h` : `${hours}h ${minutes}m`;
  }

  public static label(value: string): string {
    return value.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').trim();
  }
}
