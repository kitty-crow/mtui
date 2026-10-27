/** Character sets are presentation policy, independent of the telemetry model. */
export class Glyphs {
  constructor(public readonly ascii = false) {}
  public get bar(): string { return this.ascii ? '#' : '━'; }
  public get track(): string { return this.ascii ? '-' : '─'; }
  public get separator(): string { return this.ascii ? ' | ' : ' · '; }
  public get dash(): string { return 'N/A'; }
  public get blocks(): string { return this.ascii ? '.:-=+*#%@' : '▁▂▃▄▅▆▇█'; }
  public get border(): 'single' | 'round' { return this.ascii ? 'single' : 'round'; }
}
