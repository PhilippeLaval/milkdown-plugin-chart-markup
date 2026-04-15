import { describe, expect, it } from 'vitest';
import {
  chartMarkupLanguageTag,
  chartMarkupMicromarkExtension,
  isChartLanguageTag,
} from './index.js';

describe('micromark-extension-chart-markup', () => {
  it('exports the chart language tag constant', () => {
    expect(chartMarkupLanguageTag).toBe('chart');
  });

  it('factory reports the known tag', () => {
    expect(chartMarkupMicromarkExtension().knownLanguageTags).toEqual(['chart']);
  });

  it('isChartLanguageTag is a narrow type guard', () => {
    expect(isChartLanguageTag('chart')).toBe(true);
    expect(isChartLanguageTag('json')).toBe(false);
    expect(isChartLanguageTag(null)).toBe(false);
    expect(isChartLanguageTag(undefined)).toBe(false);
  });
});
