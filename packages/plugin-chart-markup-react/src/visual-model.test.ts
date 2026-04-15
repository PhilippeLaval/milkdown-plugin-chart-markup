import { describe, expect, it } from 'vitest';
import type { ChartConfig } from 'mdast-util-chart-markup';
import { configToVisual, isVisualSupported, visualToConfig } from './visual-model.js';

const base: ChartConfig = {
  type: 'bar',
  data: {
    labels: ['A', 'B'],
    datasets: [{ label: 'd1', data: [1, 2], backgroundColor: '#ff0000' }],
  },
  options: {
    plugins: { title: { display: true, text: 'Hello' } },
    scales: {
      x: { title: { display: true, text: 'X-axis' } },
      y: { title: { display: true, text: 'Y-axis' } },
    },
  },
};

describe('configToVisual', () => {
  it('projects title, type, labels, datasets, axis labels', () => {
    const visual = configToVisual(base);
    expect(visual).toEqual({
      title: 'Hello',
      type: 'bar',
      labels: ['A', 'B'],
      datasets: [{ label: 'd1', data: [1, 2], color: '#ff0000' }],
      xAxisLabel: 'X-axis',
      yAxisLabel: 'Y-axis',
    });
  });

  it('refuses to project unsupported chart types instead of silently coercing', () => {
    const unsupported = { ...base, type: 'waterfall' };
    expect(isVisualSupported(unsupported)).toBe(false);
    expect(() => configToVisual(unsupported)).toThrow(/not supported/);
  });

  it('accepts every built-in visual type', () => {
    for (const type of ['bar', 'line', 'pie', 'doughnut', 'radar'] as const) {
      expect(isVisualSupported({ ...base, type })).toBe(true);
      expect(configToVisual({ ...base, type }).type).toBe(type);
    }
  });

  it('locks the visual tab when a dataset contains null gap points', () => {
    const withNull: ChartConfig = {
      ...base,
      data: { ...base.data, datasets: [{ label: 'd', data: [1, null as any, 3] }] },
    };
    expect(isVisualSupported(withNull)).toBe(false);
    expect(() => configToVisual(withNull)).toThrow(/not supported/);
  });

  it('locks the visual tab when a dataset contains string cells', () => {
    const withString: ChartConfig = {
      ...base,
      data: { ...base.data, datasets: [{ label: 'd', data: ['1' as any, '2'] }] },
    };
    expect(isVisualSupported(withString)).toBe(false);
  });

  it('locks the visual tab when a dataset contains bubble-style {x,y,r} objects', () => {
    const withObjects: ChartConfig = {
      ...base,
      data: {
        ...base.data,
        datasets: [{ label: 'd', data: [{ x: 1, y: 2, r: 3 } as any] }],
      },
    };
    expect(isVisualSupported(withObjects)).toBe(false);
  });
});

describe('visualToConfig', () => {
  it('round-trips base → visual → config without losing unknown fields', () => {
    const withUnknown: ChartConfig = {
      ...base,
      options: {
        ...base.options,
        // @ts-expect-error — non-standard Chart.js plugin options
        plugins: { ...base.options!.plugins, tooltip: { enabled: false } },
      },
    };
    const next = visualToConfig(configToVisual(withUnknown), withUnknown);
    expect((next.options as any).plugins.tooltip).toEqual({ enabled: false });
  });

  it('applies visual edits without dropping existing dataset fields', () => {
    const next = visualToConfig(
      { ...configToVisual(base), title: 'Updated' },
      base,
    );
    expect((next.options as any).plugins.title.text).toBe('Updated');
    expect((next.data.datasets[0] as any).backgroundColor).toBe('#ff0000');
  });
});
