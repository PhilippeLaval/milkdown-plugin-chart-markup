import type { ChartConfig } from 'mdast-util-chart-markup';

/**
 * Minimal Chart.js-like interface — same pattern as plugin-chart-markup.
 * The host provides a factory that creates a real Chart instance; this
 * package never imports Chart.js directly.
 */
export interface ChartJsLike {
  toBase64Image(type?: string, quality?: number): string;
  destroy(): void;
}

export interface ChartJsFactory {
  (canvas: HTMLCanvasElement, config: ChartConfig): ChartJsLike;
}

export interface RenderOptions {
  /** Canvas width in pixels. Default: 800 */
  width?: number;
  /** Canvas height in pixels. Default: 400 */
  height?: number;
  /** Device pixel ratio. Default: 2 */
  devicePixelRatio?: number;
  /** PNG MIME type. Default: 'image/png' */
  mimeType?: string;
}

export interface PrintOptions extends RenderOptions {
  /**
   * Factory that creates a Chart.js instance on a canvas.
   * Required — the consumer must provide this so the package stays
   * Chart.js-version-agnostic.
   */
  chartFactory: ChartJsFactory;
}
