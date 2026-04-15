import { CHART_MARKUP_NODE_NAME, chartMarkupPlugin, type ChartMarkupPluginManifest, type ChartMarkupPluginOptions } from '@philippe-laval/plugin-chart-markup';

/**
 * React bridge: produces a manifest that host apps register into Milkdown via
 * `editor.use(useChartMarkupReact())`. We return the same manifest shape as
 * the core plugin — the React package adds the toolbar/panel components on top
 * of it but does not reshape the plugin wire protocol.
 */
export function useChartMarkupReact(options?: ChartMarkupPluginOptions): ChartMarkupPluginManifest & { react: true } {
  return Object.assign(chartMarkupPlugin(options), { react: true as const, nodeName: CHART_MARKUP_NODE_NAME });
}
