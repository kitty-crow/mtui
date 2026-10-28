import type { Options } from '../cli/Options.ts';
import { ApiConfig } from '../api/config/ApiConfig.ts';
import { SessionFactory } from './SessionFactory.ts';
import { HeadlessSession } from './HeadlessSession.ts';
import type { MonitorSession } from './MonitorSession.ts';

/** Selects the operating mode and closes the monitor and API on every exit path. */
export class Application {
  public async run(options: Options): Promise<void> {
    const session = await new SessionFactory().create(options);
    try {
      if (options.serve) {
        const endpoint = session.startApi(new ApiConfig().read());
        await new HeadlessSession().run(session, endpoint);
        return;
      }
      if (options.once || !process.stdout.isTTY || !process.stdin.isTTY) {
        await session.monitor.refresh();
        await this.print(session, options);
        return;
      }
      const { TerminalSession } = await import('./TerminalSession.tsx');
      const terminal = new TerminalSession();
      const endpoint = options.api && session.remote === null ? session.startApi(new ApiConfig().read()) : null;
      await terminal.run(session, options, endpoint);
    } finally { session.close(); }
  }

  private async print(session: MonitorSession, options: Options): Promise<void> {
    if (options.json) { console.log(JSON.stringify(session.catalogue.payload(), null, 2)); return; }
    const { TerminalSession } = await import('./TerminalSession.tsx');
    new TerminalSession().print(session, options);
  }
}
