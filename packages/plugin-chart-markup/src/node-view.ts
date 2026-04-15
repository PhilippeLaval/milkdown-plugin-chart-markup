import { computePrintHash, isPrintDrifted, parseChartMarkup, type ChartConfig } from 'mdast-util-chart-markup';

/**
 * Chart.js is optional — tests and SSR-style tools should be able to import
 * this module without loading the Chart.js runtime. The host passes a factory
 * at mount time that returns a real Chart instance.
 */
export interface ChartJsLike {
  update(): void;
  destroy(): void;
  config: { type: string; data: unknown; options?: unknown };
}

export interface ChartJsFactory {
  (canvas: HTMLCanvasElement, config: ChartConfig): ChartJsLike;
}

export interface ChartNodeViewOptions {
  chartFactory: ChartJsFactory;
  showDriftWarning?: boolean;
  onError?: (error: Error) => void;
}

export interface ChartNodeViewHandle {
  /** The DOM node the host inserts into its ProseMirror NodeView slot. */
  readonly dom: HTMLElement;
  update(rawJson: string, print: string | null, printHash: string | null): void;
  destroy(): void;
}

/**
 * Mounts a canvas + Chart.js instance inside a styled container. Returns a
 * handle that the ProseMirror NodeView wrapper forwards `update`/`destroy` to.
 */
export function mountChartNodeView(
  document: Document,
  initial: { rawJson: string; print: string | null; printHash: string | null },
  options: ChartNodeViewOptions,
): ChartNodeViewHandle {
  const dom = document.createElement('div');
  dom.className = 'chart-markup-block';
  dom.setAttribute('data-chart-markup', 'true');

  const badge = document.createElement('span');
  badge.className = 'chart-markup-badge';
  badge.textContent = '📊';
  dom.appendChild(badge);

  const drift = document.createElement('span');
  drift.className = 'chart-markup-drift-badge';
  drift.textContent = '⚠ Print outdated';
  drift.hidden = true;
  dom.appendChild(drift);

  const canvas = document.createElement('canvas');
  dom.appendChild(canvas);

  const errorEl = document.createElement('pre');
  errorEl.className = 'chart-markup-error';
  errorEl.hidden = true;
  dom.appendChild(errorEl);

  let chart: ChartJsLike | null = null;

  function render(rawJson: string, print: string | null, printHash: string | null) {
    const parsed = parseChartMarkup(rawJson);
    if (parsed.type !== 'chartMarkup') {
      dom.classList.add('chart-markup-invalid');
      errorEl.hidden = false;
      errorEl.textContent = `⚠ Invalid chart config — ${parsed.error}`;
      canvas.hidden = true;
      if (chart) {
        chart.destroy();
        chart = null;
      }
      return;
    }

    dom.classList.remove('chart-markup-invalid');
    errorEl.hidden = true;
    canvas.hidden = false;

    try {
      if (chart) chart.destroy();
      chart = options.chartFactory(canvas, parsed.config);
    } catch (error) {
      options.onError?.(error as Error);
      dom.classList.add('chart-markup-invalid');
      errorEl.hidden = false;
      errorEl.textContent = `⚠ Chart render error — ${(error as Error).message}`;
      canvas.hidden = true;
    }

    if (options.showDriftWarning !== false) {
      const value = { ...parsed.config, print: print ?? undefined, printHash: printHash ?? undefined };
      drift.hidden = !(print && printHash && isPrintDrifted(value));
    }
  }

  render(initial.rawJson, initial.print, initial.printHash);

  return {
    dom,
    update(rawJson, print, printHash) {
      render(rawJson, print, printHash);
    },
    destroy() {
      if (chart) chart.destroy();
      chart = null;
    },
  };
}

/** Exported for the React wrapper and tests that want to inspect the hash. */
export { computePrintHash };
