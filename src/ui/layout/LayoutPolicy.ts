/** All vertical budgets are measured in terminal rows, including panel borders. */
export class LayoutPolicy {
  public readonly headerHeight: number;
  public readonly bodyHeight: number;
  public readonly supported: boolean;
  constructor(public readonly width: number, public readonly height: number) {
    this.headerHeight = height >= 32 ? 5 : 1;
    this.bodyHeight = height - this.headerHeight - 4;
    this.supported = width >= 70 && height >= 24;
  }
}
