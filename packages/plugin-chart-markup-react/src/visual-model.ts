import type { ChartConfig } from 'mdast-util-chart-markup';

/**
 * Flat form of a ChartConfig used by the visual-editor tab. We project a
 * ChartConfig → VisualModel on load and VisualModel → ChartConfig on save,
 * which lets the visual tab ignore unsupported fields without losing them: the
 * raw JSON tab remains authoritative.
 */
export interface VisualDataset {
  label: string;
  data: number[];
  color?: string;
}

export type VisualSupportedType = 'bar' | 'line' | 'pie' | 'doughnut' | 'radar';

export interface VisualModel {
  title: string;
  type: VisualSupportedType;
  labels: string[];
  datasets: VisualDataset[];
  xAxisLabel: string;
  yAxisLabel: string;
}

export const VISUAL_SUPPORTED_TYPES: VisualSupportedType[] = [
  'bar',
  'line',
  'pie',
  'doughnut',
  'radar',
];

/**
 * Returns true when the visual tab can losslessly project this config to its
 * flat model and back. Requires both:
 *
 * - A chart type the visual tab understands (bar/line/pie/doughnut/radar).
 * - Every dataset value being a finite number. Bubble-style `{x,y,r}` cells,
 *   `null` gap points, strings, or nested objects would be silently coerced
 *   to `NaN`/`0` on the way in and corrupt the config on the way out — so we
 *   lock the visual tab shut and force the user to edit raw JSON instead.
 */
export function isVisualSupported(config: ChartConfig): boolean {
  if (!(VISUAL_SUPPORTED_TYPES as string[]).includes(config.type)) return false;
  if (!Array.isArray(config.data?.datasets)) return false;
  for (const ds of config.data.datasets) {
    if (!ds || !Array.isArray(ds.data)) return false;
    for (const cell of ds.data) {
      if (typeof cell !== 'number' || !Number.isFinite(cell)) return false;
    }
  }
  return true;
}

export function configToVisual(config: ChartConfig): VisualModel {
  if (!isVisualSupported(config)) {
    throw new Error(
      `Chart type "${config.type}" is not supported by the visual editor. Use the raw JSON tab.`,
    );
  }
  const type = config.type as VisualSupportedType;
  const title =
    pickString(config, ['options', 'plugins', 'title', 'text']) ?? '';
  const labels = (config.data.labels ?? []).map(String);
  const datasets = config.data.datasets.map((ds) => ({
    label: String(ds.label ?? ''),
    data: (ds.data as unknown[]).map(Number),
    color: typeof ds.backgroundColor === 'string' ? ds.backgroundColor : undefined,
  }));
  return {
    title,
    type,
    labels,
    datasets,
    xAxisLabel: pickString(config, ['options', 'scales', 'x', 'title', 'text']) ?? '',
    yAxisLabel: pickString(config, ['options', 'scales', 'y', 'title', 'text']) ?? '',
  };
}

/**
 * Re-project VisualModel back onto a base ChartConfig. We intentionally merge
 * into the base config (rather than replacing it) so any fields the visual tab
 * did not know about — custom Chart.js plugin options, etc. — are preserved.
 */
export function visualToConfig(visual: VisualModel, base: ChartConfig): ChartConfig {
  const next: ChartConfig = structuredClone(base);
  next.type = visual.type;
  next.data.labels = visual.labels.slice();
  next.data.datasets = visual.datasets.map((ds, i) => ({
    ...(base.data.datasets[i] ?? {}),
    label: ds.label,
    data: ds.data.slice(),
    ...(ds.color ? { backgroundColor: ds.color } : {}),
  }));

  const options = (next.options ??= {}) as Record<string, Record<string, unknown>>;
  const plugins = (options.plugins ??= {}) as Record<string, Record<string, unknown>>;
  plugins.title = { display: true, text: visual.title };

  if (visual.type === 'bar' || visual.type === 'line') {
    const scales = (options.scales ??= {}) as Record<string, Record<string, unknown>>;
    scales.x = { ...(scales.x ?? {}), title: { display: true, text: visual.xAxisLabel } };
    scales.y = { ...(scales.y ?? {}), title: { display: true, text: visual.yAxisLabel } };
  }

  return next;
}

function pickString(obj: unknown, path: string[]): string | undefined {
  let cur: unknown = obj;
  for (const key of path) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return typeof cur === 'string' ? cur : undefined;
}
