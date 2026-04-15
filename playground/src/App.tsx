import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  ArcElement,
  DoughnutController,
  PieController,
  RadarController,
  RadialLinearScale,
  PolarAreaController,
  BubbleController,
  ScatterController,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import {
  extractChartBlocks,
  computePrintHash,
  isPrintDrifted,
  parseChartMarkup,
  type ChartMarkupValue,
  CHART_MARKUP_NODE_TYPE,
} from 'mdast-util-chart-markup';
import { ChartToolbar } from '@milkdown/plugin-chart-markup-react';
import { marked } from 'marked';
import { SAMPLES, type Sample } from './samples.js';

marked.setOptions({ gfm: true, breaks: false });

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  ArcElement,
  DoughnutController,
  PieController,
  RadarController,
  RadialLinearScale,
  PolarAreaController,
  BubbleController,
  ScatterController,
  Title,
  Tooltip,
  Legend,
  Filler,
);

// Vivid palette + high-contrast text so the dark-theme playground produces
// legible screenshots for the visual E2E proof. Without these, Chart.js's
// translucent grey defaults vanish against the navy background.
const PALETTE = ['#38bdf8', '#f472b6', '#fbbf24', '#34d399', '#a78bfa', '#fb923c'];
Chart.defaults.color = '#e2e8f0';
Chart.defaults.borderColor = 'rgba(148, 163, 184, 0.35)';
Chart.defaults.font.family = 'system-ui, -apple-system, "Segoe UI", sans-serif';
Chart.defaults.plugins.title.color = '#f8fafc';
Chart.defaults.plugins.title.font = { size: 16, weight: 'bold' };

function applyPalette(config: any) {
  const datasets = Array.isArray(config?.data?.datasets) ? config.data.datasets : [];
  datasets.forEach((ds: any, i: number) => {
    const color = PALETTE[i % PALETTE.length];
    if (ds.backgroundColor == null) {
      if (config.type === 'pie' || config.type === 'doughnut' || config.type === 'polarArea') {
        ds.backgroundColor = PALETTE.slice(0, (ds.data ?? []).length);
      } else {
        ds.backgroundColor = color;
      }
    }
    if (ds.borderColor == null) ds.borderColor = color;
    if (ds.borderWidth == null) ds.borderWidth = 2;
    if ((config.type === 'line' || config.type === 'radar') && ds.pointBackgroundColor == null) {
      ds.pointBackgroundColor = color;
    }
  });
  return config;
}

export function App(): JSX.Element {
  const [activeId, setActiveId] = useState<Sample['id']>(SAMPLES[0]!.id);
  const active = SAMPLES.find((s) => s.id === activeId) ?? SAMPLES[0]!;
  const [source, setSource] = useState(active.source);

  useEffect(() => {
    setSource(active.source);
  }, [activeId]);

  const segments = useMemo(() => splitDocument(source), [source]);
  const chartCount = segments.filter((s) => s.type === 'chart').length;

  return (
    <div className="playground">
      <aside className="playground-sidebar">
        <h1>chart-markup playground</h1>
        <p className="playground-intro">
          First-class chart blocks in markdown. Edit the source on the left — the canvases on the
          right re-render live.
        </p>
        <h2>Samples</h2>
        <ul>
          {SAMPLES.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                data-testid={`sample-${s.id}`}
                aria-current={s.id === activeId}
                onClick={() => setActiveId(s.id)}
              >
                {s.title}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="playground-editor">
        <h2>Source markdown</h2>
        <textarea
          data-testid="playground-source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          spellCheck={false}
          rows={40}
        />
      </section>

      <section className="playground-preview">
        <h2>Rendered markdown</h2>
        <div data-testid="playground-chart-count" hidden>
          {chartCount}
        </div>
        <article className="playground-document" data-testid="playground-document">
          {segments.map((segment, i) => {
            if (segment.type === 'prose') {
              return <ProseSegment key={i} markdown={segment.markdown} />;
            }
            const chartIndex = segments
              .slice(0, i + 1)
              .filter((s) => s.type === 'chart').length - 1;
            return <ChartBlockView key={i} index={chartIndex} raw={segment.raw} />;
          })}
        </article>
      </section>
    </div>
  );
}

type DocSegment =
  | { type: 'prose'; markdown: string }
  | { type: 'chart'; raw: string };

function splitDocument(source: string): DocSegment[] {
  const blocks = extractChartBlocks(source);
  const lines = source.split('\n');
  const segments: DocSegment[] = [];
  let cursor = 0;
  for (const block of blocks) {
    if (block.startLine > cursor) {
      const proseLines = lines.slice(cursor, block.startLine);
      const markdown = proseLines.join('\n').trim();
      if (markdown) segments.push({ type: 'prose', markdown });
    }
    segments.push({ type: 'chart', raw: block.raw });
    cursor = block.endLine + 1;
  }
  if (cursor < lines.length) {
    const markdown = lines.slice(cursor).join('\n').trim();
    if (markdown) segments.push({ type: 'prose', markdown });
  }
  return segments;
}

function ProseSegment(props: { markdown: string }): JSX.Element {
  const html = useMemo(() => marked.parse(props.markdown) as string, [props.markdown]);
  return (
    <div
      className="playground-prose"
      data-testid="prose-segment"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function ChartBlockView(props: { index: number; raw: string }): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const parsed = parseChartMarkup(props.raw);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (parsed.type !== CHART_MARKUP_NODE_TYPE) {
      chartRef.current?.destroy();
      chartRef.current = null;
      return;
    }
    chartRef.current?.destroy();
    try {
      chartRef.current = new Chart(canvasRef.current, applyPalette(structuredClone(parsed.config)) as any);
    } catch (error) {
      console.error('[playground] chart render failed', error);
    }
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [props.raw]);

  if (parsed.type !== CHART_MARKUP_NODE_TYPE) {
    return (
      <div className="chart-markup-block chart-markup-invalid" data-testid={`chart-${props.index}`}>
        <span className="chart-markup-badge">⚠</span>
        <pre className="chart-markup-error">Invalid chart config — {parsed.error}</pre>
      </div>
    );
  }

  const full: ChartMarkupValue = {
    ...parsed.config,
    print: parsed.print,
    printHash: parsed.printHash,
  };
  const drifted = isPrintDrifted(full);

  return (
    <div
      className="chart-markup-block"
      data-testid={`chart-${props.index}`}
      data-chart-type={parsed.config.type}
    >
      <header className="chart-markup-header">
        <span className="chart-markup-badge">📊</span>
        <span className="chart-markup-type">{parsed.config.type}</span>
        {drifted && (
          <span className="chart-markup-drift-badge" data-testid={`chart-${props.index}-drift`}>
            ⚠ Print outdated
          </span>
        )}
        {parsed.print && (
          <span className="chart-markup-print-url">
            print: <code>{parsed.print}</code>
          </span>
        )}
        {parsed.printHash && (
          <span className="chart-markup-print-hash">
            recomputed: <code>{computePrintHash(parsed.config)}</code>
          </span>
        )}
      </header>
      <canvas ref={canvasRef} />
      <ChartToolbar
        config={parsed.config}
        driftWarning={drifted}
        onTypeChange={() => {
          /* playground is read-only below the canvas */
        }}
        onEditConfig={() => {
          /* edit in the textarea above */
        }}
        onRefreshPrint={() => {
          /* host responsibility */
        }}
        onDelete={() => {
          /* remove by editing the markdown source */
        }}
      />
    </div>
  );
}
