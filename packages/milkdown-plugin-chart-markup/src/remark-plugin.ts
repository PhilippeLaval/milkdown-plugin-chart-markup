import { $remark } from '@milkdown/utils';
import {
  chartMarkupToMarkdown,
  remarkChartMarkup,
} from 'mdast-util-chart-markup';

type RemarkPluginRaw = (...args: unknown[]) => unknown;

/**
 * Unified/remark plugin that:
 *
 *  1. Runs the mdast transform from `mdast-util-chart-markup` which upgrades
 *     every `code` node whose lang is `chart` into a first-class `chartMarkup`
 *     mdast node (with parsed `config`, `print`, `printHash` fields).
 *  2. Registers the matching mdast-util-to-markdown handler on the unified
 *     processor's `toMarkdownExtensions`, so `remark-stringify` knows how to
 *     serialize those `chartMarkup` nodes back into the canonical fenced-code
 *     block.
 *
 * The micromark extension from `micromark-extension-chart-markup` is currently
 * a no-op (chart fences reuse the built-in fenced code tokenizer), but it is
 * referenced here so future syntax variants can plug in without a breaking
 * change to the adapter.
 */
function chartMarkupUnifiedPlugin(): RemarkPluginRaw {
  const inner = remarkChartMarkup() as unknown as (tree: unknown, file: unknown) => unknown;
  return function plugin(this: { data(): Record<string, unknown> }) {
    const data = this.data();
    const toMdExts = (data.toMarkdownExtensions ??= []) as unknown[];
    toMdExts.push(chartMarkupToMarkdown());
    return function transformer(tree: unknown, file: unknown) {
      return inner(tree, file);
    };
  } as unknown as RemarkPluginRaw;
}

export const chartMarkupRemark = $remark(
  'remarkChartMarkup',
  () => chartMarkupUnifiedPlugin() as never,
);
