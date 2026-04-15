/**
 * micromark-extension-chart-markup
 *
 * Chart blocks re-use micromark's built-in fenced code tokenizer — the language
 * tag `chart` is enough to identify them downstream. This module exposes the
 * shared constant and a no-op extension factory that keeps the surface area
 * stable for future syntax variants (e.g. `chart-yaml`).
 */

export const chartMarkupLanguageTag = 'chart' as const;

export type ChartMarkupLanguageTag = typeof chartMarkupLanguageTag;

export interface MicromarkExtension {
  /** Reserved for future custom constructs — currently empty. */
  readonly knownLanguageTags: readonly string[];
}

export function chartMarkupMicromarkExtension(): MicromarkExtension {
  return { knownLanguageTags: [chartMarkupLanguageTag] };
}

export function isChartLanguageTag(lang: string | null | undefined): lang is ChartMarkupLanguageTag {
  return lang === chartMarkupLanguageTag;
}
