import type { MonitorSession } from './MonitorSession.ts';

/** The HTTP service runs without stdin, a TTY or any mounted React tree. */
export class HeadlessSession {
  public async run(session: MonitorSession, endpoint: string): Promise<void> {
    console.log(`mTUI API listening at ${endpoint}${session.identity.demo ? ' (simulated telemetry)' : ''}`);
    session.monitor.start();
    await new Promise<void>(resolve => {
      const stop = () => { process.off('SIGINT', stop); process.off('SIGTERM', stop); resolve(); };
      process.once('SIGINT', stop);
      process.once('SIGTERM', stop);
    });
  }
}
