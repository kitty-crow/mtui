export type ViewId = 'overview' | 'graphics' | 'processor' | 'memory' | 'sensors';
export const views: readonly ViewId[] = ['overview', 'graphics', 'processor', 'memory', 'sensors'];

export interface NavigationState {
  readonly view: ViewId;
  readonly offset: number;
  readonly gpuIndex: number;
  readonly help: boolean;
}

/** View navigation is deterministic and independent of React and hardware APIs. */
export class NavigationController {
  private state: NavigationState = { view: 'overview', offset: 0, gpuIndex: 0, help: false };
  private readonly listeners = new Set<() => void>();
  public getState = (): NavigationState => this.state;
  public subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };

  public select(view: ViewId): void { this.update({ view, offset: 0, help: false }); }
  public cycle(direction: number): void { this.select(views[(views.indexOf(this.state.view) + direction + views.length) % views.length] ?? 'overview'); }
  public scroll(delta: number, maximum: number): void { this.update({ offset: Math.min(Math.max(0, maximum), Math.max(0, this.state.offset + delta)) }); }
  public selectGpu(delta: number, count: number): void {
    const gpuIndex = Math.max(0, Math.min(count - 1, this.state.gpuIndex + delta));
    this.update({ gpuIndex, offset: gpuIndex });
  }
  public toggleHelp(): void { this.update({ help: !this.state.help }); }
  public dismissHelp(): void { this.update({ help: false }); }

  private update(patch: Partial<NavigationState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
}
