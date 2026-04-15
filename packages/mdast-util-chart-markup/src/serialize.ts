import { canonicalStringify, sortKeysDeep } from './canonical.js';
import { chartMarkupNodeToValue } from './parse.js';
import type { ChartMarkupNode, ChartMarkupValue } from './types.js';

/**
 * Serialize a ChartMarkupNode to a canonical markdown fenced block.
 *
 * Format:
 *   ```chart
 *   { ...canonical JSON... }
 *   ```
 *
 * `print` and `printHash` are guaranteed to be the last two keys when present,
 * even though they would otherwise sort earlier alphabetically. All other keys
 * are sorted alphabetically at every depth.
 */
export function serializeChartMarkup(node: ChartMarkupNode): string {
  const value = chartMarkupNodeToValue(node);
  return '```chart\n' + canonicalizeValueWithPrintLast(value) + '\n```';
}

export function canonicalizeValueWithPrintLast(value: ChartMarkupValue): string {
  const { print, printHash, ...rest } = value;
  const sortedBody = sortKeysDeep(rest) as Record<string, unknown>;
  if (print !== undefined) sortedBody.print = print;
  if (printHash !== undefined) sortedBody.printHash = printHash;
  return JSON.stringify(sortedBody, null, 2);
}

/**
 * Round-trip helper: take raw JSON, parse and re-serialize it in canonical
 * form. Idempotent — running twice produces the same string.
 */
export function canonicalizeChartMarkupBody(raw: string): string {
  const value = JSON.parse(raw) as ChartMarkupValue;
  return canonicalizeValueWithPrintLast(value);
}

/** Re-export to keep the serializer surface area self-contained. */
export { canonicalStringify };
