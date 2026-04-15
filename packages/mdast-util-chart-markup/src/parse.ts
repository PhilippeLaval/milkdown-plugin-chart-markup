import { chartMarkupLanguageTag } from 'micromark-extension-chart-markup';
import { canonicalStringify, sortKeysDeep } from './canonical.js';
import { stripPrintFields } from './hash.js';
import {
  CHART_MARKUP_ERROR_TYPE,
  CHART_MARKUP_NODE_TYPE,
  type ChartConfig,
  type ChartMarkupNode,
  type ChartMarkupParseError,
  type ChartMarkupParseResult,
  type ChartMarkupValue,
} from './types.js';

export interface ParseOptions {
  /** If true, unknown chart types produce an error node. Default: false. */
  strictType?: boolean;
}

const BUILTIN_TYPES = new Set([
  'bar',
  'line',
  'pie',
  'doughnut',
  'radar',
  'polarArea',
  'bubble',
  'scatter',
]);

/**
 * Parse the raw JSON body of a ```chart fenced block into a ChartMarkupNode.
 * On malformed input returns an error node instead of throwing — host editors
 * render these inline as a red warning badge.
 */
export function parseChartMarkup(raw: string, options: ParseOptions = {}): ChartMarkupParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return errorNode(raw, `Invalid JSON: ${(error as Error).message}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return errorNode(raw, 'Chart config must be a JSON object');
  }

  const full = parsed as ChartMarkupValue;
  if (typeof full.type !== 'string') {
    return errorNode(raw, 'Missing required string field "type"');
  }
  if (!full.data || typeof full.data !== 'object') {
    return errorNode(raw, 'Missing required object field "data"');
  }
  if (!Array.isArray(full.data.datasets)) {
    return errorNode(raw, 'Missing required array field "data.datasets"');
  }

  if (options.strictType && !BUILTIN_TYPES.has(full.type)) {
    return errorNode(raw, `Unknown chart type "${full.type}"`);
  }

  const config = stripPrintFields(full) as ChartConfig;

  const node: ChartMarkupNode = {
    type: CHART_MARKUP_NODE_TYPE,
    lang: chartMarkupLanguageTag,
    value: raw,
    config,
  };
  if (typeof full.print === 'string') node.print = full.print;
  if (typeof full.printHash === 'string') node.printHash = full.printHash;

  return node;
}

function errorNode(raw: string, message: string): ChartMarkupParseError {
  return {
    type: CHART_MARKUP_ERROR_TYPE,
    lang: chartMarkupLanguageTag,
    value: raw,
    error: message,
  };
}

/**
 * Parse a ChartMarkupNode back into its canonical `ChartMarkupValue` object —
 * i.e. the config plus optional print fields. Used by serializers and the
 * drift checker.
 */
export function chartMarkupNodeToValue(node: ChartMarkupNode): ChartMarkupValue {
  const value: ChartMarkupValue = { ...sortKeysDeep(node.config) };
  if (node.print !== undefined) value.print = node.print;
  if (node.printHash !== undefined) value.printHash = node.printHash;
  return value;
}

/**
 * Container-prefix matcher for fenced code blocks nested inside block-quotes
 * and list items.
 *
 * CommonMark constraints we honor here:
 *
 * - A fenced code block outside a container can have at most 3 spaces of
 *   leading indentation. A line with 4+ leading spaces starts an *indented*
 *   code block, and its contents (even if they look like ```` ```chart ````)
 *   are literal text. `BARE_FENCE_INDENT` enforces this.
 * - Inside a container, the prefix consists of one or more container tokens
 *   (`>`, `-`, `*`, `+`, `1.`, `1)`) each followed by at least one space,
 *   optionally preceded by up to 3 spaces of indentation per level. We match
 *   one or more container tokens — a line with only bare indentation is not
 *   a container prefix.
 */
const BARE_FENCE_INDENT = / {0,3}/;
const CONTAINER_TOKEN = / {0,3}(?:>|[-*+]|\d+[.)]) +/;
const CONTAINER_PREFIX_RE = new RegExp(
  `^(?:${CONTAINER_TOKEN.source})+`,
);

function detectFencePrefix(line: string): { prefix: string; body: string } | null {
  const container = CONTAINER_PREFIX_RE.exec(line);
  if (container) {
    return { prefix: container[0], body: line.slice(container[0].length) };
  }
  const bare = BARE_FENCE_INDENT.exec(line);
  return { prefix: bare ? bare[0] : '', body: line.slice(bare ? bare[0].length : 0) };
}

/**
 * Regex-based extractor that finds every chart fenced block in a raw markdown
 * document. Handles common CommonMark containers (blockquote, ordered/unordered
 * list items, and combinations of them). Useful for Node-side tooling (export
 * pipeline, tests) that does not want to pull in the full unified/remark stack.
 *
 * Known limitations — this is a pragmatic extractor, not a full CommonMark
 * parser. For structurally-complex documents that matter, use the remark
 * plugin in `remark.ts` instead.
 */
export function extractChartBlocks(markdown: string): Array<{
  startLine: number;
  endLine: number;
  raw: string;
  parsed: ChartMarkupParseResult;
}> {
  const lines = markdown.split('\n');
  const out: Array<{
    startLine: number;
    endLine: number;
    raw: string;
    parsed: ChartMarkupParseResult;
  }> = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const detected = detectFencePrefix(line);
    if (!detected) {
      i += 1;
      continue;
    }
    if (detected.body.replace(/\s+$/, '') !== '```chart') {
      i += 1;
      continue;
    }
    const prefix = detected.prefix;
    const startLine = i;
    i += 1;
    const body: string[] = [];
    while (i < lines.length) {
      const innerLine = lines[i]!;
      const innerDetected = detectFencePrefix(innerLine);
      if (innerDetected && innerDetected.body.replace(/\s+$/, '') === '```') {
        break;
      }
      // Strip whichever container prefix this line carries — using the
      // original opening-fence prefix length as an upper bound — so the
      // extracted body is the pure JSON source.
      const stripLen = Math.min(prefix.length, innerLine.length);
      body.push(innerLine.slice(stripLen));
      i += 1;
    }
    const endLine = i;
    const raw = body.join('\n');
    out.push({ startLine, endLine, raw, parsed: parseChartMarkup(raw) });
    i += 1;
  }
  return out;
}

/** Canonicalize a raw JSON body without changing its parsed meaning. */
export function canonicalizeChartBody(raw: string): string {
  const parsed = JSON.parse(raw);
  return canonicalStringify(parsed);
}
