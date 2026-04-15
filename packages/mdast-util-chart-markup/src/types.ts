import { chartMarkupLanguageTag } from 'micromark-extension-chart-markup';

export type ChartMarkupLang = typeof chartMarkupLanguageTag;

/**
 * Chart.js config as seen by this plugin. We keep it structurally open — the
 * plugin never interprets it, just round-trips the JSON and (optionally) hands
 * it to Chart.js in the runtime NodeView.
 */
export interface ChartConfig {
  type: string;
  data: {
    labels?: unknown[];
    datasets: Array<{ label?: string; data: unknown[]; [key: string]: unknown }>;
    [key: string]: unknown;
  };
  options?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Full on-disk shape — config plus the two export-pipeline fields. */
export interface ChartMarkupValue extends ChartConfig {
  print?: string;
  printHash?: string;
}

export interface ChartMarkupNode {
  type: 'chartMarkup';
  lang: ChartMarkupLang;
  /** Raw JSON source, the canonical form. */
  value: string;
  /** Parsed Chart.js config (minus print fields). */
  config: ChartConfig;
  print?: string;
  printHash?: string;
  /** Position in source markdown, if known. */
  position?: unknown;
}

export interface ChartMarkupParseError {
  type: 'chartMarkupError';
  lang: ChartMarkupLang;
  value: string;
  error: string;
}

export type ChartMarkupParseResult = ChartMarkupNode | ChartMarkupParseError;

export const CHART_MARKUP_NODE_TYPE = 'chartMarkup' as const;
export const CHART_MARKUP_ERROR_TYPE = 'chartMarkupError' as const;
