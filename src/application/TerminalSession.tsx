import { render, renderToString } from 'ink';
import { TerminalCapabilities } from '../ui/terminal/TerminalCapabilities.ts';
import type { Options } from '../cli/Options.ts';
import { App } from '../ui/App.tsx';
import { Dashboard } from '../ui/layout/Dashboard.tsx';
import { NavigationController } from '../ui/navigation/NavigationController.ts';
import type { MonitorSession } from './MonitorSession.ts';

/** Ink owns alternate-screen entry, resize handling, raw input and restoration. */
export class TerminalSession {
  public print(session: MonitorSession, options: Options): void {
    const ascii = options.ascii || new TerminalCapabilities().requiresAscii();
    const navigation = new NavigationController().getState();
    console.log(renderToString(<Dashboard snapshot={session.monitor.getSnapshot()} history={session.monitor.history} identity={session.identity} navigation={navigation} width={Math.max(70, process.stdout.columns || 110)} height={32} offset={0} gpuIndex={0} interval={session.monitor.interval} paused={false} motion={false} ascii={ascii} remote={session.remote} endpoint={null} />, { columns: Math.max(70, process.stdout.columns || 110) }));
  }

  public async run(session: MonitorSession, options: Options, endpoint: string | null): Promise<void> {
    const ascii = options.ascii || new TerminalCapabilities().requiresAscii();
    const terminal = render(<App monitor={session.monitor} identity={session.identity} ascii={ascii} motion={options.motion && process.env['INK_SCREEN_READER'] !== 'true'} remote={session.remote} endpoint={endpoint} />, { alternateScreen: true, maxFps: 12, incrementalRendering: true, exitOnCtrlC: true });
    const terminate = () => { terminal.unmount(); };
    process.once('SIGTERM', terminate);
    session.monitor.start();
    try { await terminal.waitUntilExit(); }
    finally { process.off('SIGTERM', terminate); terminal.cleanup(); }
  }
}
