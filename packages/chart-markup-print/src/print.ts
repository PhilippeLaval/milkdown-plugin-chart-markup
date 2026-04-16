import {
  extractChartBlocks,
  computePrintHash,
  CHART_MARKUP_NODE_TYPE,
  type ChartConfig,
  type ChartMarkupNode,
} from 'mdast-util-chart-markup';
import { renderChartToPng } from './render.js';
import type { PrintOptions } from './types.js';

/**
 * Process a markdown document: render every valid ```chart block to PNG and
 * update its `print` and `printHash` fields in-place. Returns the modified
 * markdown string.
 *
 * Invalid chart blocks (bad JSON, missing fields) are left untouched.
 */
export function renderChartBlocksForPrint(
  markdown: string,
  options: PrintOptions,
): string {
  const blocks = extractChartBlocks(markdown);
  if (blocks.length === 0) return markdown;

  const lines = markdown.split('\n');

  // Process blocks in reverse so line-number splicing stays valid.
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i]!;
    if (block.parsed.type !== CHART_MARKUP_NODE_TYPE) continue;

    const node = block.parsed as ChartMarkupNode;
    const dataUrl = renderChartToPng(node.config, options.chartFactory, options);
    const printHash = computePrintHash(node.config);

    const updatedValue: Record<string, unknown> = {
      ...JSON.parse(block.raw),
    };
    updatedValue.print = dataUrl;
    updatedValue.printHash = printHash;

    const newBody = JSON.stringify(updatedValue, null, 2);
    const fenced = ['```chart', ...newBody.split('\n'), '```'];

    lines.splice(
      block.startLine,
      block.endLine - block.startLine + 1,
      ...fenced,
    );
  }

  return lines.join('\n');
}

/**
 * Process a markdown document: replace every valid ```chart block with a
 * markdown image tag `![chart](data:image/png;base64,...)`.
 *
 * This is the simplest output for consumers that just want images — Typora,
 * static-site generators, or any renderer that doesn't understand chart blocks.
 *
 * Invalid chart blocks are left as-is (rendered as code fences).
 */
export function renderChartBlocksAsImages(
  markdown: string,
  options: PrintOptions,
): string {
  const blocks = extractChartBlocks(markdown);
  if (blocks.length === 0) return markdown;

  const lines = markdown.split('\n');

  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i]!;
    if (block.parsed.type !== CHART_MARKUP_NODE_TYPE) continue;

    const node = block.parsed as ChartMarkupNode;
    const dataUrl = renderChartToPng(node.config, options.chartFactory, options);

    const alt = buildAltText(node.config);
    const imageTag = `![${alt}](${dataUrl})`;

    lines.splice(
      block.startLine,
      block.endLine - block.startLine + 1,
      imageTag,
    );
  }

  return lines.join('\n');
}

function buildAltText(config: ChartConfig): string {
  const datasets = config.data.datasets;
  if (datasets.length === 1 && datasets[0]?.label) {
    return `${config.type} chart: ${datasets[0].label}`;
  }
  return `${config.type} chart`;
}
