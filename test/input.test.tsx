import { describe, expect, test } from 'bun:test';
import { render } from 'ink-testing-library';
import { App } from '../src/ui/App.tsx';
import { demoMonitor } from './helpers/demo.ts';

async function waitFor(check: () => boolean): Promise<void> {
  const deadline = Date.now() + 2000;
  while (!check()) {
    if (Date.now() > deadline) throw new Error('Terminal did not render the expected state');
    await Bun.sleep(10);
  }
}

describe('interactive terminal controls', () => {
  test('switches views, pauses, changes rate and opens help', async () => {
    const { monitor, identity } = await demoMonitor();
    const terminal = render(<App monitor={monitor} identity={identity} ascii={false} motion={false} remote={null} endpoint={null} />);
    try {
      await waitFor(() => terminal.lastFrame()?.includes('GRAPHICS') ?? false);
      terminal.stdin.write('3');
      await waitFor(() => terminal.lastFrame()?.includes('LOGICAL PROCESSORS') ?? false);
      terminal.stdin.write('p');
      await waitFor(() => terminal.lastFrame()?.includes('PAUSED') ?? false);
      expect(monitor.isPaused).toBe(true);
      terminal.stdin.write('+');
      await waitFor(() => terminal.lastFrame()?.includes('0.75s') ?? false);
      terminal.stdin.write('?');
      await waitFor(() => terminal.lastFrame()?.includes('KEYBOARD & TELEMETRY') ?? false);
      terminal.stdin.write('\u001b');
      await waitFor(() => terminal.lastFrame()?.includes('LOGICAL PROCESSORS') ?? false);
      expect(terminal.stderr.lastFrame()).toBeUndefined();
    } finally { terminal.unmount(); terminal.cleanup(); monitor.stop(); }
  });
});
