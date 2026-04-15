import { chartMarkupLanguageTag, isChartLanguageTag } from 'micromark-extension-chart-markup';
import { parseChartMarkup } from './parse.js';
import { serializeChartMarkup } from './serialize.js';
import { CHART_MARKUP_NODE_TYPE, type ChartMarkupNode } from './types.js';

interface MdastCodeNode {
  type: 'code';
  lang?: string | null;
  value: string;
  position?: unknown;
}

interface MdastParent {
  type: string;
  children?: Array<MdastNode>;
  [k: string]: unknown;
}

type MdastNode = MdastCodeNode | ChartMarkupNode | MdastParent;

interface MdastRoot extends MdastParent {
  type: 'root';
}

/** From-markdown extension factory — attach to unified/remark if available. */
export function chartMarkupFromMarkdown() {
  return {
    transforms: [transformTree],
  };
}

/** To-markdown extension factory. */
export function chartMarkupToMarkdown() {
  return {
    handlers: {
      [CHART_MARKUP_NODE_TYPE]: (node: ChartMarkupNode) => serializeChartMarkup(node),
    },
  };
}

/**
 * Remark-compatible plugin: walks the mdast tree and upgrades any `code` node
 * with `lang === 'chart'` into a `chartMarkup` node. Invalid JSON stays as a
 * plain code node so the surrounding document still renders.
 */
export function remarkChartMarkup() {
  return function transformer(tree: MdastRoot) {
    transformTree(tree);
    return tree;
  };
}

/**
 * Walks the entire mdast tree (list items, blockquotes, tables, etc.) and
 * upgrades every `code` node with `lang === 'chart'` into a `chartMarkup`
 * node. The shallow v0.1.0 transform only visited the root's children, which
 * meant chart fences inside containers silently failed to round-trip.
 */
function transformTree(tree: MdastParent): void {
  visit(tree);
}

function visit(node: MdastParent): void {
  if (!node || !Array.isArray(node.children)) return;
  for (let i = 0; i < node.children.length; i += 1) {
    const child = node.children[i]!;
    if (child.type === 'code') {
      const code = child as MdastCodeNode;
      if (!isChartLanguageTag(code.lang ?? null)) continue;
      const parsed = parseChartMarkup(code.value);
      if (parsed.type === CHART_MARKUP_NODE_TYPE) {
        node.children[i] = {
          ...parsed,
          lang: chartMarkupLanguageTag,
          position: code.position,
        } as unknown as MdastNode;
      }
    } else if (Array.isArray((child as MdastParent).children)) {
      visit(child as MdastParent);
    }
  }
}
