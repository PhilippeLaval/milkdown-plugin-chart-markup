import type { ChartConfig } from 'mdast-util-chart-markup';
import type { ChartJsFactory, RenderOptions } from './types.js';

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 400;
const DEFAULT_DPR = 2;
const DEFAULT_MIME = 'image/png';

/**
 * Render a single Chart.js config to a PNG data-URL.
 *
 * Creates an offscreen canvas, instantiates Chart.js via the provided factory,
 * captures the image, and tears down. Works in any environment that has
 * `document.createElement('canvas')` (browser, Electron, JSDOM with canvas).
 */
export function renderChartToPng(
  config: ChartConfig,
  chartFactory: ChartJsFactory,
  options: RenderOptions = {},
): string {
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  const dpr = options.devicePixelRatio ?? DEFAULT_DPR;
  const mime = options.mimeType ?? DEFAULT_MIME;

  // Chart.js responsive mode reads the parent element's size. To render
  // offscreen we place the canvas inside a hidden container with explicit
  // dimensions so Chart.js picks up the correct size.
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;

  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  document.body.appendChild(container);

  // Disable animation so Chart.js renders synchronously on construction.
  const staticConfig: ChartConfig = {
    ...config,
    options: {
      ...config.options,
      animation: false as any,
      devicePixelRatio: dpr,
    },
  };

  let dataUrl: string;
  try {
    const chart = chartFactory(canvas, staticConfig);
    dataUrl = chart.toBase64Image(mime);
    chart.destroy();
  } finally {
    document.body.removeChild(container);
  }

  return dataUrl;
}
