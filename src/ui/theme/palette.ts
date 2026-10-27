/** Cool accents identify resources; warm tones indicate attention. */
export const palette = {
  text: '#E5EDF5', muted: '#94A3B8', faint: '#64748B', border: '#475569',
  cpu: '#67D8EF', memory: '#B5A2F5', graphics: '#72D6AC', sensors: '#F0C77B',
  warning: '#F0C77B', danger: '#F1848C', selection: '#25384A',
} as const;

export function temperatureColour(value: number | null): string {
  if (value !== null && value >= 90) return palette.danger;
  return value !== null && value >= 75 ? palette.warning : palette.text;
}
