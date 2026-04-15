// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountChartNodeView, type ChartJsLike } from './node-view.js';

function fakeChart(): { factory: any; last: ChartJsLike | null; destroyed: number } {
  const state = { last: null as ChartJsLike | null, destroyed: 0 };
  const factory = vi.fn((_canvas: HTMLCanvasElement, config: any) => {
    const instance: ChartJsLike = {
      config,
      update: vi.fn(),
      destroy: vi.fn(() => {
        state.destroyed += 1;
      }),
    };
    state.last = instance;
    return instance;
  });
  return { factory, ...state, get last() { return state.last; }, get destroyed() { return state.destroyed; } } as any;
}

const validBody = JSON.stringify({
  type: 'bar',
  data: { labels: ['A'], datasets: [{ label: 'x', data: [1] }] },
});

describe('mountChartNodeView', () => {
  it('mounts a canvas inside a chart-markup-block container', () => {
    const chart = fakeChart();
    const view = mountChartNodeView(
      document,
      { rawJson: validBody, print: null, printHash: null },
      { chartFactory: chart.factory },
    );
    expect(view.dom.classList.contains('chart-markup-block')).toBe(true);
    expect(view.dom.querySelector('canvas')).toBeTruthy();
    expect(chart.factory).toHaveBeenCalledTimes(1);
  });

  it('recreates the chart instance on update', () => {
    const chart = fakeChart();
    const view = mountChartNodeView(
      document,
      { rawJson: validBody, print: null, printHash: null },
      { chartFactory: chart.factory },
    );
    view.update(validBody.replace('"bar"', '"line"'), null, null);
    expect(chart.factory).toHaveBeenCalledTimes(2);
    expect(chart.factory.mock.calls[1]![1].type).toBe('line');
  });

  it('falls back to an error state when JSON is invalid', () => {
    const chart = fakeChart();
    const view = mountChartNodeView(
      document,
      { rawJson: '{ broken', print: null, printHash: null },
      { chartFactory: chart.factory },
    );
    expect(view.dom.classList.contains('chart-markup-invalid')).toBe(true);
    expect(view.dom.querySelector('.chart-markup-error')!.textContent).toMatch(/Invalid/);
    expect(chart.factory).not.toHaveBeenCalled();
  });

  it('shows the drift badge when printHash does not match the config', () => {
    const chart = fakeChart();
    const view = mountChartNodeView(
      document,
      {
        rawJson: validBody,
        print: 'https://cdn.example.com/x.png',
        printHash: 'sha256:definitely-stale',
      },
      { chartFactory: chart.factory },
    );
    const badge = view.dom.querySelector('.chart-markup-drift-badge') as HTMLElement;
    expect(badge.hidden).toBe(false);
  });

  it('destroy() tears down the Chart.js instance', () => {
    const chart = fakeChart();
    const view = mountChartNodeView(
      document,
      { rawJson: validBody, print: null, printHash: null },
      { chartFactory: chart.factory },
    );
    view.destroy();
    expect(chart.last!.destroy).toHaveBeenCalled();
  });
});
