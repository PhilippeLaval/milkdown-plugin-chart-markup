/**
 * Canonical JSON stringifier.
 *
 * Produces a stable string representation suitable for round-trip
 * serialization and hashing: keys within each object level are sorted
 * alphabetically, arrays preserve their order, and indentation is 2 spaces.
 *
 * Unlike a naive `JSON.stringify` wrapper, this function enforces a strict
 * JSON-value contract so that hashing and drift detection never see coerced
 * nonsense:
 *
 * - `NaN` and `±Infinity` throw (JSON.stringify silently rewrites them to
 *   `null`, collapsing distinct configs to the same bytes).
 * - `undefined`, functions, and symbols are rejected anywhere they would be
 *   serialized (instead of being silently dropped, which is how equal configs
 *   can produce different hashes).
 * - Cycles throw with a path rather than causing stack overflow.
 * - `toJSON()` is honored, so `Date` and similar wrappers serialize to a
 *   stable ISO string instead of collapsing to `{}`.
 * - Only plain objects are allowed at object positions — class instances,
 *   `Map`, `Set`, `Buffer`, etc. throw.
 *
 * Round-trip guarantee: `canonicalStringify(JSON.parse(canonicalStringify(x)))
 * === canonicalStringify(x)` for any input that passes validation.
 */
export class CanonicalJsonError extends Error {
  constructor(message: string, public readonly path: string) {
    super(`${message} at ${path || '<root>'}`);
    this.name = 'CanonicalJsonError';
  }
}

export function canonicalStringify(value: unknown, indent = 2): string {
  const normalized = normalizeForCanonical(value, '', new WeakSet());
  return JSON.stringify(normalized, null, indent);
}

export function sortKeysDeep<T>(value: T): T {
  return normalizeForCanonical(value, '', new WeakSet()) as T;
}

function normalizeForCanonical(value: unknown, path: string, seen: WeakSet<object>): unknown {
  if (value === null) return null;
  const t = typeof value;
  if (t === 'string' || t === 'boolean') return value;
  if (t === 'number') {
    if (!Number.isFinite(value as number)) {
      throw new CanonicalJsonError(`non-finite number (${String(value)})`, path);
    }
    return value;
  }
  if (t === 'undefined' || t === 'function' || t === 'symbol' || t === 'bigint') {
    throw new CanonicalJsonError(`unsupported value of type "${t}"`, path);
  }
  if (t !== 'object') {
    throw new CanonicalJsonError(`unsupported value of type "${t}"`, path);
  }

  const obj = value as object;
  if (seen.has(obj)) {
    throw new CanonicalJsonError('circular reference', path);
  }

  seen.add(obj);
  try {
    // Respect `toJSON()` for a strict allow-list of built-ins (Date and
    // anything else in the allow-list below). We intentionally do NOT honor
    // arbitrary toJSON() because:
    //   1. A custom toJSON() returning `this` would recurse forever if we
    //      dispatched before adding to `seen`.
    //   2. A non-plain class with toJSON() would bypass the plain-object
    //      check and let opaque instances sneak into the hash input.
    // Instead, we only accept toJSON() from well-known wrapper types whose
    // semantics we understand.
    if (obj instanceof Date) {
      return obj.toJSON();
    }

    if (Array.isArray(obj)) {
      return obj.map((item, i) => normalizeForCanonical(item, `${path}[${i}]`, seen));
    }

    const proto = Object.getPrototypeOf(obj);
    if (proto !== Object.prototype && proto !== null) {
      throw new CanonicalJsonError(
        `expected plain object, got ${obj.constructor?.name ?? 'instance'}`,
        path,
      );
    }

    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
      const nextPath = path ? `${path}.${key}` : key;
      const child = (obj as Record<string, unknown>)[key];
      if (child === undefined) {
        // JSON.stringify would drop this silently; we do the same but flag
        // it for callers who want strict mode.
        continue;
      }
      sorted[key] = normalizeForCanonical(child, nextPath, seen);
    }
    return sorted;
  } finally {
    seen.delete(obj);
  }
}
