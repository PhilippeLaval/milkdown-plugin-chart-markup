import type { MilkdownPlugin } from '@milkdown/ctx';
import type { ChartJsFactory } from '@philippe-laval/plugin-chart-markup';
import type { ChartConfig } from 'mdast-util-chart-markup';
import { createChartMarkupCtx } from './ctx.js';
import { chartMarkupRemark } from './remark-plugin.js';
import { chartMarkupNode } from './node.js';
import { createChartMarkupView } from './node-view.js';
import { chartMarkupKeymap } from './keymap.js';

export interface MilkdownChartMarkupOptions {
  /**
   * Required. Host-provided factory that instantiates a Chart.js instance on
   * the given canvas. Hosts are responsible for calling `Chart.register(...)`
   * for the controllers they need before mounting the editor.
   */
  chartFactory: ChartJsFactory;
  /**
   * Optional. Called when a chart block is created or its config changes.
   * Returns a CDN URL + hash for server-side PNG rendering.
   */
  onChartChange?: (
    pos: number,
    config: ChartConfig,
  ) => Promise<{ print: string; printHash: string }>;
  /** Optional. Default Chart.js options merged into every chart for branding. */
  defaultOptions?: Record<string, unknown>;
  /** Optional. Show the "⚠ Print outdated" badge when the hash drifts. Default true. */
  showDriftWarning?: boolean;
  /**
   * Optional. If true, the keymap and commands are NOT registered. Use this
   * for read-only viewers. Schema, parser, serializer, and node view are still
   * wired so existing chart content renders correctly. Default false.
   */
  readOnly?: boolean;
}

/**
 * Factory returning a Milkdown plugin array. Hosts `.use()` the result on a
 * Milkdown editor to get chart blocks working end-to-end: parsing,
 * serializing, schema, node view, and (unless read-only) keymap.
 */
export function chartMarkup(options: MilkdownChartMarkupOptions): MilkdownPlugin[] {
  const resolved = {
    chartFactory: options.chartFactory,
    onChartChange: options.onChartChange,
    defaultOptions: options.defaultOptions,
    showDriftWarning: options.showDriftWarning ?? true,
    readOnly: options.readOnly ?? false,
  };

  const optionsCtx = createChartMarkupCtx(resolved);
  const view = createChartMarkupView(optionsCtx);

  const plugins: MilkdownPlugin[] = [
    optionsCtx,
    ...chartMarkupRemark,
    chartMarkupNode,
    view,
  ];

  if (!resolved.readOnly) {
    plugins.push(...chartMarkupKeymap);
  }

  return plugins;
}
