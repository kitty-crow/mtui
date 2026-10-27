import { timingSafeEqual } from 'node:crypto';

/** Optional bearer authentication, configured identically on host and client. */
export class TokenGuard {
  constructor(private readonly token: string | null) {}

  public accepts(request: Request): boolean {
    if (this.token === null) return true;
    const actual = Buffer.from(request.headers.get('Authorization') ?? '');
    const expected = Buffer.from(`Bearer ${this.token}`);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}
