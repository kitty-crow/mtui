import { describe, expect, test } from 'bun:test';
import { ApiRouter } from '../src/api/routing/ApiRouter.ts';
import { ApiServer } from '../src/api/transport/ApiServer.ts';
import { payloadSchema } from '../src/remote/PayloadSchema.ts';
import { emptySnapshot } from '../src/domain/snapshot.ts';
import { body, demoMonitor, request } from './helpers/demo.ts';

describe('JSON resources', () => {
  test('exports the full versioned snapshot', async () => {
    const { router, monitor } = await demoMonitor();
    const payload = await body(router.handle(request('/snapshot')));
    expect(payloadSchema.parse(payload).snapshot).toEqual(monitor.getSnapshot());
  });
  test.each(['/gpu', '/proc', '/ram', '/sensors'])('exposes %s without starting extra collections', async path => {
    const { router, monitor } = await demoMonitor();
    expect((await body(router.handle(request(path))))['status']).toBe('live');
    expect(monitor.getSnapshot().sequence).toBe(1);
  });
  test.each([
    ['/gpu/0/temp', '°C'], ['/gpu/1/temperature', '°C'], ['/gpu/0/vram/used', 'bytes'],
    ['/gpu/0/fan', '%'], ['/proc/cores/0/usage', '%'], ['/proc/cores/1/speed', 'GHz'],
    ['/proc/coreTemperatures/0', '°C'], ['/ram/modules/0/size', 'bytes'], ['/ram/used', 'bytes'],
  ])('exposes individual datapoints at %s', async (path, unit) => {
    const { router } = await demoMonitor();
    const response = router.handle(request(path));
    const data = await body(response);
    expect(response.status).toBe(200);
    expect(data['unit']).toBe(unit);
    expect(typeof data['value']).toBe('number');
    expect(typeof data['updatedAt']).toBe('number');
  });
  test('preserves null metrics without inventing zero', async () => {
    const { router } = await demoMonitor();
    const response = router.handle(request('/gpu/1/fan'));
    expect(response.status).toBe(200);
    expect((await body(response))['value']).toBeNull();
  });
  test('exposes each sensor unit and the exact chart series', async () => {
    const { router, monitor } = await demoMonitor();
    expect((await body(router.handle(request('/sensors/0/value'))))['unit']).toBe('°C');
    expect(await router.handle(request('/history')).json()).toEqual(monitor.history.all());
  });
  test.each(['/gpu/7', '/proc/cores/10000', '/ram/noSuchField', '/ram/__proto__', '/ram/constructor', '/nothing'])('returns a JSON 404 at %s', async path => {
    const { router } = await demoMonitor();
    const response = router.handle(request(path));
    expect(response.status).toBe(404);
    expect((await body(response))['error']).toBeDefined();
  });
  test('separates an unavailable provider from a missing device', async () => {
    const { router, registry, monitor } = await demoMonitor();
    registry.remove('graphics');
    await monitor.refresh();
    expect(router.handle(request('/gpu')).status).toBe(503);
    expect((await body(router.handle(request('/gpu'))))['status']).toBe('unavailable');
  });
  test('retains stale readings with their original timestamp', async () => {
    const { router, registry, monitor } = await demoMonitor();
    const initial = monitor.getSnapshot().readings.cpu;
    let fail = false;
    registry.register('cpu', { name: 'test', collect: async () => { if (fail) throw new Error('driver lost'); return initial.value ?? Promise.reject(new Error('missing fixture')); } });
    await monitor.refresh();
    const timestamp = monitor.getSnapshot().readings.cpu.updatedAt;
    fail = true;
    await monitor.refresh();
    expect(await body(router.handle(request('/proc/temp')))).toMatchObject({ status: 'stale', updatedAt: timestamp, value: initial.value?.temperature });
  });
  test('publishes readiness and a JSON Schema', async () => {
    const { router } = await demoMonitor();
    expect((await body(router.handle(request('/health'))))['status']).toBe('ready');
    expect((await body(router.handle(request('/schema'))))['properties']).toBeDefined();
    expect(emptySnapshot().sequence).toBe(0);
  });
});

describe('HTTP boundary', () => {
  test('supports HEAD, rejects mutations and malformed escapes', async () => {
    const { router } = await demoMonitor();
    expect(await router.handle(request('/gpu', { method: 'HEAD' })).text()).toBe('');
    expect(router.handle(request('/gpu', { method: 'POST' })).status).toBe(405);
    expect(router.handle(request('/gpu/%E0%A4')).status).toBe(400);
  });
  test('authenticates all routes when a token is configured', async () => {
    const { catalogue } = await demoMonitor();
    const router = new ApiRouter(catalogue, 'token');
    expect(router.handle(request('/snapshot')).status).toBe(401);
    expect(router.handle(request('/snapshot', { headers: { Authorization: 'Bearer wrong' } })).status).toBe(401);
    expect(router.handle(request('/snapshot', { headers: { Authorization: 'Bearer token' } })).status).toBe(200);
  });
  test('serves requests over an actual socket and releases the port', async () => {
    const { router } = await demoMonitor();
    const server = new ApiServer({ port: 0, hostname: '127.0.0.1', token: null }, router);
    const port = server.start();
    try {
      const response = await fetch(`http://127.0.0.1:${port}/gpu/0/temp`);
      expect(response.status).toBe(200);
      expect((await body(response))['unit']).toBe('°C');
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    } finally { server.stop(); }
  });
});
