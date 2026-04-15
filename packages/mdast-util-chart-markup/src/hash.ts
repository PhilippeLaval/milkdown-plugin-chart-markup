import { canonicalStringify } from './canonical.js';
import { sha256Hex } from './sha256.js';
import type { ChartConfig, ChartMarkupValue } from './types.js';

/**
 * Compute `sha256:<hex>` for a chart config. The `print` and `printHash` fields
 * are stripped before hashing so round-tripping a stored hash is stable.
 *
 * The export pipeline and editor UI both call this to detect drift: if the
 * recomputed hash differs from the stored one, the PNG at `print` is stale.
 */
export function computePrintHash(config: ChartConfig | ChartMarkupValue): string {
  const stripped = stripPrintFields(config);
  const canonical = canonicalStringify(stripped);
  return `sha256:${sha256Hex(canonical)}`;
}

export function stripPrintFields<T extends Record<string, unknown>>(value: T): Omit<T, 'print' | 'printHash'> {
  const { print: _print, printHash: _printHash, ...rest } = value as Record<string, unknown>;
  return rest as Omit<T, 'print' | 'printHash'>;
}

export function isPrintDrifted(value: ChartMarkupValue): boolean {
  if (!value.print || !value.printHash) return false;
  return normalizePrintHash(computePrintHash(value)) !== normalizePrintHash(value.printHash);
}

/**
 * Hashes in the wild are stored two ways: as `sha256:<64hex>` (what this
 * plugin writes) and as the bare 64-hex digest (what some node-canvas
 * pipelines emit). Both should round-trip cleanly; we compare on the bare
 * digest and accept either prefix form.
 */
export function normalizePrintHash(hash: string): string {
  const lower = hash.trim().toLowerCase();
  if (lower.startsWith('sha256:')) return lower.slice('sha256:'.length);
  return lower;
}
