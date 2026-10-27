import { createElement } from 'react';
import { mkdir } from 'node:fs/promises';
import type { ViewId } from '../src/ui/navigation/NavigationController.ts';
import { PreviewScenario } from './preview/PreviewScenario.mts';
import { TerminalSvg } from './preview/TerminalSvg.mts';

process.env['FORCE_COLOR'] = '3';
delete process.env['NO_COLOR'];
const { renderToString } = await import('ink');
const { Dashboard } = await import('../src/ui/layout/Dashboard.tsx');
const scenario = new PreviewScenario().create();
const renderer = new TerminalSvg();
const identity = { host: { hostname: 'demo-workstation', platform: 'linux', release: 'demo', architecture: 'x64' }, version: '0.1.0', demo: true };
const previews: readonly ViewId[] = ['overview', 'graphics', 'processor'];
await mkdir('assets', { recursive: true });
for (const view of previews) {
  const navigation = { view, offset: 0, gpuIndex: 0, help: false };
  const frame = renderToString(createElement(Dashboard, { ...scenario, identity, navigation, width: 110, height: 32, offset: 0, gpuIndex: 0, interval: 1000, paused: false, motion: false, ascii: false, remote: null, endpoint: 'http://0.0.0.0:9700' }), { columns: 110 });
  await Bun.write(`assets/${view}.svg`, renderer.render(frame, 110, `mTUI / ${view} / simulated telemetry`));
}
console.log('Updated overview, graphics and processor previews.');
