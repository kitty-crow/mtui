import { useEffect, useState } from 'react';
import type { MonitorEngine } from '../../monitoring/MonitorEngine.ts';

/** One subscription carries snapshots and user-controlled monitor state. */
export function useMonitor(monitor: MonitorEngine) {
  const read = () => ({ snapshot: monitor.getSnapshot(), paused: monitor.isPaused, interval: monitor.interval });
  const [state, setState] = useState(read);
  useEffect(() => {
    const unsubscribe = monitor.subscribe(() => { setState(read()); });
    setState(read());
    return unsubscribe;
  }, [monitor]);
  return state;
}
