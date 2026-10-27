import { describe, expect, test } from 'bun:test';
import { ApiServer } from '../src/api/transport/ApiServer.ts';
import { ApiRouter } from '../src/api/routing/ApiRouter.ts';
import { RemoteClient } from '../src/remote/RemoteClient.ts';
import { RemoteSnapshotSource } from '../src/remote/RemoteSnapshotSource.ts';
import { payloadSchema } from '../src/remote/PayloadSchema.ts';
import { demoMonitor } from './helpers/demo.ts';

describe('remote monitoring', () => {
  test('connects to the HTTP server with an optional shared token', async () => {
    const { catalogue } = await demoMonitor();
    const server = new ApiServer({ port: 0, hostname: '127.0.0.1', token: 'secret' }, new ApiRouter(catalogue, 'secret'));
    const port = server.start();
    try {
      const client = new RemoteClient(`http://127.0.0.1:${port}`, 'secret');
      expect((await client.read()).host.hostname).toBe('test-host');
      await expect(new RemoteClient(`http://127.0.0.1:${port}`).read()).rejects.toThrow('HTTP 401');
    } finally { server.stop(); }
  });
  test('preserves host readings and freshness after the connection drops', async () => {
    const { catalogue } = await demoMonitor();
    let disconnected = false;
    const source = new RemoteSnapshotSource({ read: async () => { if (disconnected) throw new Error('offline'); return catalogue.payload(); } });
    const live = await source.read(1);
    disconnected = true;
    const stale = await source.read(2);
    expect(stale.readings.cpu.status).toBe('stale');
    expect(stale.readings.cpu.value).toEqual(live.readings.cpu.value);
    expect(stale.readings.cpu.updatedAt).toBe(live.readings.cpu.updatedAt);
    expect(stale.uptime).toBe(live.uptime);
  });
  test('marks a paused host as stale instead of claiming live updates', async () => {
    const { catalogue } = await demoMonitor();
    const source = new RemoteSnapshotSource({ read: async () => ({ ...catalogue.payload(), paused: true }) });
    expect((await source.read(1)).readings.cpu).toMatchObject({ status: 'stale', message: 'The host monitor is paused' });
  });
  test('rejects incompatible or malformed wire payloads', () => {
    expect(payloadSchema.safeParse({ schemaVersion: 99 }).success).toBe(false);
    expect(() => new RemoteClient('ftp://example.test')).toThrow();
    expect(() => new RemoteClient('http://user:password@example.test')).toThrow();
  });
});
