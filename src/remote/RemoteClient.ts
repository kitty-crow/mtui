import type { ApiPayload } from '../api/resources/ApiPayload.ts';
import { payloadSchema } from './PayloadSchema.ts';

/** A bounded, authenticated JSON client. It never executes remote code. */
export class RemoteClient {
  public readonly url: URL;

  constructor(address: string, private readonly token: string | null = null) {
    this.url = new URL(address);
    if (!['http:', 'https:'].includes(this.url.protocol) || this.url.username || this.url.password) throw new Error('Remote address needs an HTTP(S) URL without embedded credentials');
    this.url.pathname = '/snapshot';
    this.url.search = '';
    this.url.hash = '';
  }

  public async read(): Promise<ApiPayload> {
    const headers = new Headers({ Accept: 'application/json' });
    if (this.token !== null) headers.set('Authorization', `Bearer ${this.token}`);
    const response = await fetch(this.url, { headers, signal: AbortSignal.timeout(3500), redirect: 'error' });
    if (!response.ok) throw new Error(`Remote API returned HTTP ${response.status}`);
    const text = await response.text();
    if (text.length > 8 * 1024 * 1024) throw new Error('Remote snapshot exceeds 8 MiB');
    const value: unknown = JSON.parse(text);
    return payloadSchema.parse(value);
  }
}
