import { $ctx } from '@milkdown/utils';
import type { ChartJsFactory } from '@philippe-laval/plugin-chart-markup';
import type { ChartConfig } from 'mdast-util-chart-markup';

export interface ChartMarkupRuntimeOptions {
  chartFactory: ChartJsFactory;
  onChartChange?: (
    pos: number,
    config: ChartConfig,
  ) => Promise<{ print: string; printHash: string }>;
  defaultOptions?: Record<string, unknown>;
  showDriftWarning: boolean;
  readOnly: boolean;
}

export type ChartMarkupCtx = ReturnType<typeof createChartMarkupCtx>;

/**
 * Each call to `chartMarkup(options)` creates its own ctx slice so multiple
 * Milkdown editor instances can mount the plugin with distinct chart factories
 * without stomping on each other.
 */
export function createChartMarkupCtx(initial: ChartMarkupRuntimeOptions) {
  return $ctx<ChartMarkupRuntimeOptions, 'chartMarkupOptions'>(initial, 'chartMarkupOptions');
}
