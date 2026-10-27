/** Every response, including errors, stays machine readable and uncached. */
export class JsonResponse {
  public static send(value: unknown, status = 200, extra: Readonly<Record<string, string>> = {}): Response {
    const headers = new Headers(extra);
    headers.set('Content-Type', 'application/json; charset=utf-8');
    headers.set('Cache-Control', 'no-store');
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(JSON.stringify(value), { status, headers });
  }

  public static error(status: number, code: string, message: string): Response {
    return this.send({ error: { code, message } }, status);
  }
}
