export interface PathResult { readonly found: boolean; readonly value: unknown }

/** Traverses only own data properties; prototype and oversized indices are rejected. */
export class DataPath {
  public resolve(root: unknown, segments: readonly string[]): PathResult {
    let value: unknown = root;
    for (const segment of segments) {
      const next = this.property(value, segment);
      if (!next.found) return next;
      value = next.value;
    }
    return { found: true, value };
  }

  private property(value: unknown, key: string): PathResult {
    const missing = { found: false, value: null };
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return missing;
    if (Array.isArray(value)) return /^(0|[1-9]\d*)$/.test(key) && Number(key) < value.length ? { found: true, value: value[Number(key)] } : missing;
    if (typeof value !== 'object' || value === null || !Object.hasOwn(value, key)) return missing;
    return { found: true, value: (value as Record<string, unknown>)[key] };
  }
}
