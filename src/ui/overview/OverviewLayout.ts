/** Shares the overview's row budget with keyboard pagination. */
export class OverviewLayout {
  public readonly sensorHeight: number;
  public readonly gpuHeight: number;
  public readonly tableRows: number;

  constructor(height: number, gpuCount: number) {
    const ideal = Math.max(8, Math.min(12, gpuCount + 6));
    this.sensorHeight = height - 9 - ideal >= 5 ? height - 9 - ideal : 0;
    this.gpuHeight = height - 9 - this.sensorHeight;
    const capacity = Math.max(1, this.gpuHeight - 6);
    this.tableRows = Math.max(1, capacity - (gpuCount > capacity ? 1 : 0));
  }
}
