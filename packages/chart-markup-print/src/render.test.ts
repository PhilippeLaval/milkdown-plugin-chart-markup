import { describe, expect, it, vi } from 'vitest';
import type { ChartConfig } from 'mdast-util-chart-markup';
import { renderChartToPng } from './render.js';
import type { ChartJsFactory, ChartJsLike } from './types.js';

const barConfig: ChartConfig = {
  type: 'bar',
  data: {
    labels: ['Q1', 'Q2'],
    datasets: [{ label: 'Revenue', data: [10, 20] }],
  },
};

function mockFactory(): { factory: ChartJsFactory; calls: Array<{ canvas: HTMLCanvasElement; config: ChartConfig }> } {
  const calls: Array<{ canvas: HTMLCanvasElement; config: ChartConfig }> = [];
  const factory: ChartJsFactory = (canvas, config) => {
    calls.push({ canvas, config });
    const chart: ChartJsLike = {
      toBase64Image: (type?: string) => `data:${type ?? 'image/png'};base64,FAKE_PNG`,
      destroy: vi.fn(),
    };
    return chart;
  };
  return { factory, calls };
}

describe('renderChartToPng', () => {
  it('returns a data URL from the chart factory', () => {
    const { factory } = mockFactory();
    const result = renderChartToPng(barConfig, factory);
    expect(result).toBe('data:image/png;base64,FAKE_PNG');
  });

  it('places the canvas in a hidden DOM container with correct dimensions', () => {
    const { factory, calls } = mockFactory();
    renderChartToPng(barConfig, factory);
    expect(calls).toHaveLength(1);
    const canvas = calls[0]!.canvas;
    expect(canvas.parentElement).toBeTruthy();
    const container = canvas.parentElement!;
    expect(container.style.width).toBe('800px');
    expect(container.style.height).toBe('400px');
  });

  it('respects custom width/height options on the container', () => {
    const { factory, calls } = mockFactory();
    renderChartToPng(barConfig, factory, { width: 400, height: 300, devicePixelRatio: 1 });
    const container = calls[0]!.canvas.parentElement!;
    expect(container.style.width).toBe('400px');
    expect(container.style.height).toBe('300px');
  });

  it('destroys the chart instance after capturing', () => {
    const destroyFn = vi.fn();
    const trackingFactory: ChartJsFactory = (canvas, config) => ({
      toBase64Image: () => 'data:image/png;base64,X',
      destroy: destroyFn,
    });
    renderChartToPng(barConfig, trackingFactory);
    expect(destroyFn).toHaveBeenCalledOnce();
  });

  it('injects animation:false and devicePixelRatio into the config', () => {
    const { factory, calls } = mockFactory();
    renderChartToPng(barConfig, factory);
    const config = calls[0]!.config;
    expect(config.type).toBe('bar');
    expect(config.data).toEqual(barConfig.data);
    expect((config.options as any)?.animation).toBe(false);
    expect((config.options as any)?.devicePixelRatio).toBe(2);
  });

  it('cleans up the container from the DOM after rendering', () => {
    const { factory } = mockFactory();
    const beforeCount = document.body.children.length;
    renderChartToPng(barConfig, factory);
    expect(document.body.children.length).toBe(beforeCount);
  });
});
