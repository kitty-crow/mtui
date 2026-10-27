import { z } from 'zod';
import { payloadSchema } from '../../remote/PayloadSchema.ts';
import type { ResourceCatalogue } from '../resources/ResourceCatalogue.ts';
import { JsonResponse } from '../transport/JsonResponse.ts';
import { TokenGuard } from '../transport/TokenGuard.ts';
import { DataPath } from './DataPath.ts';
import { MetricUnits } from './MetricUnits.ts';
import { discovery } from './discovery.ts';

/** A small read-only router; raw datapoint paths all use the same resolver. */
export class ApiRouter {
  private readonly paths = new DataPath();
  private readonly units = new MetricUnits();
  private readonly guard: TokenGuard;

  constructor(private readonly catalogue: ResourceCatalogue, token: string | null = null) { this.guard = new TokenGuard(token); }

  public handle = (request: Request): Response => {
    const response = this.respond(request);
    return request.method === 'HEAD' ? new Response(null, { status: response.status, headers: response.headers }) : response;
  };

  private respond(request: Request): Response {
    if (!this.guard.accepts(request)) return JsonResponse.send({ error: { code: 'unauthorised', message: 'A valid bearer token is required' } }, 401, { 'WWW-Authenticate': 'Bearer' });
    if (request.method !== 'GET' && request.method !== 'HEAD') return JsonResponse.send({ error: { code: 'method_not_allowed', message: 'This API is read-only' } }, 405, { Allow: 'GET, HEAD' });
    try {
      const url = new URL(request.url);
      const path = url.pathname.split('/').filter(Boolean).map(segment => decodeURIComponent(segment));
      return this.route(path);
    } catch {
      return JsonResponse.error(400, 'invalid_path', 'The request path could not be read');
    }
  }

  private route(path: readonly string[]): Response {
    const [resource = '', ...segments] = path;
    if (resource === '' || resource === 'api') return JsonResponse.send(discovery);
    if (resource === 'schema') return JsonResponse.send(z.toJSONSchema(payloadSchema));
    if (resource === 'snapshot') return this.resolve(this.catalogue.payload(), segments);
    if (resource === 'system') return this.system(segments);
    if (resource === 'health') return this.health();
    if (resource === 'history') return this.resolve(this.catalogue.history(), segments);
    const target = this.catalogue.resource(resource);
    if (target === null) return JsonResponse.error(404, 'unknown_resource', 'No resource exists at this path. See /api for available routes.');
    if (target.value === null) return JsonResponse.send({ schemaVersion: 1, resource, ...target.reading, unit: null }, 503);
    const result = this.paths.resolve(target.value, segments);
    if (!result.found) return JsonResponse.error(404, 'unknown_datapoint', 'The device, index or datapoint was not found');
    const reading = resource === 'sensors' && /^\d+$/.test(segments[0] ?? '') ? this.catalogue.sensorReading(Number(segments[0])) ?? target.reading : target.reading;
    return JsonResponse.send({ schemaVersion: 1, resource: `/${[resource, ...segments].join('/')}`, status: reading.status, updatedAt: reading.updatedAt, message: reading.message, unit: this.unit(resource, segments, target.value), value: result.value });
  }

  private resolve(value: unknown, path: readonly string[]): Response {
    const result = this.paths.resolve(value, path);
    return result.found ? JsonResponse.send(result.value) : JsonResponse.error(404, 'unknown_datapoint', 'The datapoint was not found');
  }

  private system(path: readonly string[]): Response {
    const payload = this.catalogue.payload();
    return this.resolve({ host: payload.host, version: payload.version, demo: payload.demo, intervalMs: payload.intervalMs, paused: payload.paused, uptime: payload.snapshot.uptime, sampledAt: payload.snapshot.sampledAt, collectors: payload.snapshot.readings }, path);
  }

  private health(): Response {
    const { snapshot } = this.catalogue.payload();
    return JsonResponse.send({ status: snapshot.sequence === 0 ? 'starting' : 'ready', sampledAt: snapshot.sampledAt, collectors: Object.fromEntries(Object.entries(snapshot.readings).map(([name, reading]) => [name, reading.status])) }, snapshot.sequence === 0 ? 503 : 200);
  }

  private unit(resource: string, path: readonly string[], root: unknown): string | null {
    if (resource === 'sensors' && path.at(-1) === 'value') {
      const result = this.paths.resolve(root, [...path.slice(0, -1), 'unit']);
      return typeof result.value === 'string' ? result.value : null;
    }
    const keyPath = /^\d+$/.test(path.at(-1) ?? '') ? path.slice(0, -1) : path;
    return this.units.forPath(resource, keyPath);
  }
}
