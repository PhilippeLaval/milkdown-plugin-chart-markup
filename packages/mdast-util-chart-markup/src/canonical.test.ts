import { describe, expect, it } from 'vitest';
import { CanonicalJsonError, canonicalStringify, sortKeysDeep } from './canonical.js';

describe('canonicalStringify', () => {
  it('sorts keys alphabetically at every depth', () => {
    const out = canonicalStringify({ b: 2, a: { z: 1, y: 2 } });
    expect(out).toBe('{\n  "a": {\n    "y": 2,\n    "z": 1\n  },\n  "b": 2\n}');
  });

  it('preserves array order', () => {
    expect(canonicalStringify([3, 1, 2])).toBe('[\n  3,\n  1,\n  2\n]');
  });

  it('is idempotent across multiple passes', () => {
    const input = { foo: { bar: [1, { c: 3, a: 1, b: 2 }] } };
    const once = canonicalStringify(input);
    const twice = canonicalStringify(JSON.parse(once));
    expect(twice).toBe(once);
  });

  it('does not mutate input', () => {
    const input = { b: 2, a: 1 };
    sortKeysDeep(input);
    expect(Object.keys(input)).toEqual(['b', 'a']);
  });

  it('handles primitives, null, and empty objects', () => {
    expect(canonicalStringify(42)).toBe('42');
    expect(canonicalStringify(null)).toBe('null');
    expect(canonicalStringify({})).toBe('{}');
    expect(canonicalStringify([])).toBe('[]');
  });

  it('rejects NaN and Infinity instead of silently emitting null', () => {
    expect(() => canonicalStringify({ x: NaN })).toThrow(CanonicalJsonError);
    expect(() => canonicalStringify({ x: Infinity })).toThrow(/non-finite/);
    expect(() => canonicalStringify({ x: -Infinity })).toThrow(/non-finite/);
  });

  it('rejects unsupported value types (undefined, function, symbol, bigint)', () => {
    expect(() => canonicalStringify({ a: () => 1 })).toThrow(/function/);
    expect(() => canonicalStringify({ a: Symbol('x') })).toThrow(/symbol/);
    expect(() => canonicalStringify({ a: 10n })).toThrow(/bigint/);
  });

  it('still drops undefined values like JSON.stringify does (defensible default)', () => {
    expect(canonicalStringify({ a: undefined, b: 1 })).toBe('{\n  "b": 1\n}');
  });

  it('throws a CanonicalJsonError with a dotted path for circular references', () => {
    const root: Record<string, unknown> = { a: { b: {} } };
    (root.a as any).b.back = root;
    expect(() => canonicalStringify(root)).toThrow(/circular reference/);
    try {
      canonicalStringify(root);
    } catch (error) {
      expect(error).toBeInstanceOf(CanonicalJsonError);
      expect((error as CanonicalJsonError).path).toBe('a.b.back');
    }
  });

  it('respects toJSON so Date becomes its ISO string', () => {
    const d = new Date('2025-01-02T03:04:05.000Z');
    expect(canonicalStringify({ when: d })).toBe(
      '{\n  "when": "2025-01-02T03:04:05.000Z"\n}',
    );
  });

  it('rejects class instances and built-ins (Map/Set/Buffer)', () => {
    class Point {
      constructor(public x: number, public y: number) {}
    }
    expect(() => canonicalStringify({ p: new Point(1, 2) })).toThrow(/plain object/);
    expect(() => canonicalStringify({ m: new Map() })).toThrow(/plain object/);
    expect(() => canonicalStringify({ s: new Set() })).toThrow(/plain object/);
  });

  it('does NOT honor arbitrary toJSON — class instances with toJSON still throw', () => {
    class HostileWithToJson {
      toJSON() {
        return { hostile: true };
      }
    }
    expect(() => canonicalStringify({ h: new HostileWithToJson() })).toThrow(/plain object/);
  });

  it('cannot be made to recurse forever via toJSON returning this', () => {
    class SelfReturning {
      toJSON() {
        return this;
      }
    }
    expect(() => canonicalStringify({ s: new SelfReturning() })).toThrow(/plain object/);
  });

  it('Date is still honored as a special case', () => {
    const out = canonicalStringify({ when: new Date('2025-06-01T00:00:00.000Z') });
    expect(out).toContain('"2025-06-01T00:00:00.000Z"');
  });
});
