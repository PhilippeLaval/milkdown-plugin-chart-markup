import type { ChartConfig } from 'mdast-util-chart-markup';
import { CHART_MARKUP_NODE_NAME, chartMarkupNodeSpec } from './node-spec.js';
import { createDefaultChartConfig } from './default-template.js';
import { chartMarkupKeymap } from './keymap.js';

export interface ChartMarkupPluginOptions {
  /**
   * Called when a chart block is created or its config changes. Host app uses
   * this to trigger server-side PNG rendering and return the CDN URL.
   */
  onChartChange?: (pos: number, config: ChartConfig) => Promise<{ print: string; printHash: string }>;
  /** Default Chart.js options merged into every chart (branding). */
  defaultOptions?: Record<string, unknown>;
  /** Show the yellow `⚠ Print outdated` badge when the hash drifts. */
  showDriftWarning?: boolean;
}

export interface ChartMarkupPluginManifest {
  name: 'chartMarkup';
  nodeName: typeof CHART_MARKUP_NODE_NAME;
  nodeSpec: typeof chartMarkupNodeSpec;
  keymap: typeof chartMarkupKeymap;
  options: Required<Pick<ChartMarkupPluginOptions, 'showDriftWarning'>> & ChartMarkupPluginOptions;
  createDefaultChartConfig: () => ChartConfig;
}

/**
 * Factory returning a plugin manifest that the Milkdown adapter in the host
 * app wires into its schema. We keep it free of `@milkdown/core` so the core
 * package compiles without pulling in the editor runtime during tests.
 */
export function chartMarkupPlugin(options: ChartMarkupPluginOptions = {}): ChartMarkupPluginManifest {
  return {
    name: 'chartMarkup',
    nodeName: CHART_MARKUP_NODE_NAME,
    nodeSpec: chartMarkupNodeSpec,
    keymap: chartMarkupKeymap,
    options: {
      showDriftWarning: true,
      ...options,
    },
    createDefaultChartConfig,
  };
}
