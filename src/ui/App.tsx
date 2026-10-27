import { useMemo, useSyncExternalStore } from 'react';
import { useApp, useInput, useWindowSize } from 'ink';
import type { MonitorEngine } from '../monitoring/MonitorEngine.ts';
import type { MonitorIdentity } from '../api/resources/ApiPayload.ts';
import { NavigationController } from './navigation/NavigationController.ts';
import { InputController } from './navigation/InputController.ts';
import { useMonitor } from './hooks/useMonitor.ts';
import { Dashboard } from './layout/Dashboard.tsx';
import { LayoutPolicy } from './layout/LayoutPolicy.ts';

interface Props { readonly monitor: MonitorEngine; readonly identity: MonitorIdentity; readonly ascii: boolean; readonly motion: boolean; readonly remote: string | null; readonly endpoint: string | null }

/** Hooks are confined to terminal integration; views are pure class components. */
export function App({ monitor, identity, ascii, motion, remote, endpoint }: Props) {
  const { exit } = useApp();
  const { columns, rows } = useWindowSize();
  const navigation = useMemo(() => new NavigationController(), []);
  const input = useMemo(() => new InputController(navigation, monitor), [navigation, monitor]);
  const state = useSyncExternalStore(navigation.subscribe, navigation.getState, navigation.getState);
  const telemetry = useMonitor(monitor);
  useInput((text, key) => {
    if (input.handle(text, key, new LayoutPolicy(columns, rows).bodyHeight) === 'exit') exit();
  });
  return <Dashboard {...telemetry} identity={identity} navigation={state} history={monitor.history} width={columns} height={rows} offset={state.offset} gpuIndex={state.gpuIndex} ascii={ascii} motion={motion} remote={remote} endpoint={endpoint} />;
}
