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

  it('creates a canvas with default dimensions (800x400 @2x)', () => {
    const { factory, calls } = mockFactory();
    renderChartToPng(barConfig, factory);
    expect(calls).toHaveLength(1);
    const canvas = calls[0]!.canvas;
    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(800);
  });

  it('respects custom width/height/dpr options', () => {
    const { factory, calls } = mockFactory();
    renderChartToPng(barConfig, factory, { width: 400, height: 300, devicePixelRatio: 1 });
    const canvas = calls[0]!.canvas;
    expect(canvas.width).toBe(400);
    expect(canvas.height).toBe(300);
  });

  it('destroys the chart instance after capturing', () => {
    const { factory, calls } = mockFactory();
    renderChartToPng(barConfig, factory);
    // The factory returns a mock — check destroy was called via the calls array
    // We need to access the chart instance; let's track it differently
    const destroyFn = vi.fn();
    const trackingFactory: ChartJsFactory = (canvas, config) => ({
      toBase64Image: () => 'data:image/png;base64,X',
      destroy: destroyFn,
    });
    renderChartToPng(barConfig, trackingFactory);
    expect(destroyFn).toHaveBeenCalledOnce();
  });

  it('passes the config to the factory unchanged', () => {
    const { factory, calls } = mockFactory();
    renderChartToPng(barConfig, factory);
    expect(calls[0]!.config).toBe(barConfig);
  });
});
