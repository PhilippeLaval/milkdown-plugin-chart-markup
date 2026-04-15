import { useEffect, useMemo, useState } from 'react';
import { canonicalStringify, type ChartConfig } from 'mdast-util-chart-markup';
import {
  configToVisual,
  isVisualSupported,
  visualToConfig,
  type VisualModel,
} from './visual-model.js';

export interface ChartEditorPanelProps {
  config: ChartConfig;
  print?: string;
  printHash?: string;
  onConfigChange: (config: ChartConfig) => void;
  onRegeneratePrint?: () => Promise<void>;
  mode?: 'popover' | 'sidebar';
}

export function ChartEditorPanel(props: ChartEditorPanelProps): JSX.Element {
  const visualSupported = isVisualSupported(props.config);
  const [tab, setTab] = useState<'visual' | 'raw'>(visualSupported ? 'visual' : 'raw');
  const [visual, setVisual] = useState<VisualModel | null>(() =>
    visualSupported ? configToVisual(props.config) : null,
  );
  const [raw, setRaw] = useState<string>(() => canonicalStringify(props.config));
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (isVisualSupported(props.config)) {
      setVisual(configToVisual(props.config));
    } else {
      setVisual(null);
      setTab('raw');
    }
    setRaw(canonicalStringify(props.config));
  }, [props.config]);

  const commitVisual = (next: VisualModel) => {
    if (!visualSupported) return;
    setVisual(next);
    const cfg = visualToConfig(next, props.config);
    setRaw(canonicalStringify(cfg));
    props.onConfigChange(cfg);
  };

  const commitRaw = () => {
    try {
      const cfg = JSON.parse(raw) as ChartConfig;
      setJsonError(null);
      setVisual(configToVisual(cfg));
      props.onConfigChange(cfg);
    } catch (error) {
      setJsonError((error as Error).message);
    }
  };

  const className = useMemo(
    () => `chart-editor-panel chart-editor-panel--${props.mode ?? 'popover'}`,
    [props.mode],
  );

  return (
    <div className={className} data-testid="chart-editor-panel">
      <div className="chart-editor-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'visual'}
          disabled={!visualSupported}
          title={
            visualSupported
              ? undefined
              : `Visual editor does not support chart type "${props.config.type}". Use the raw JSON tab.`
          }
          onClick={() => visualSupported && setTab('visual')}
        >
          Visual editor
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'raw'}
          onClick={() => setTab('raw')}
        >
          Raw JSON
        </button>
      </div>

      {tab === 'visual' && visual ? (
        <VisualTab visual={visual} onChange={commitVisual} />
      ) : (
        <RawTab
          raw={raw}
          onRawChange={setRaw}
          onBlur={commitRaw}
          jsonError={jsonError}
          print={props.print}
          printHash={props.printHash}
          onRegeneratePrint={props.onRegeneratePrint}
        />
      )}
    </div>
  );
}

function VisualTab(props: { visual: VisualModel; onChange: (v: VisualModel) => void }): JSX.Element {
  const { visual, onChange } = props;
  return (
    <div className="chart-editor-visual">
      <label>
        Title
        <input
          data-testid="chart-editor-title"
          value={visual.title}
          onChange={(e) => onChange({ ...visual, title: e.target.value })}
        />
      </label>
      <label>
        Type
        <select
          data-testid="chart-editor-type"
          value={visual.type}
          onChange={(e) => onChange({ ...visual, type: e.target.value as VisualModel['type'] })}
        >
          {(['bar', 'line', 'pie', 'doughnut', 'radar'] as const).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label>
        Labels (comma separated)
        <input
          data-testid="chart-editor-labels"
          value={visual.labels.join(', ')}
          onChange={(e) =>
            onChange({ ...visual, labels: e.target.value.split(',').map((s) => s.trim()) })
          }
        />
      </label>
      {visual.datasets.map((ds, i) => (
        <fieldset key={i}>
          <legend>Dataset {i + 1}</legend>
          <label>
            Label
            <input
              value={ds.label}
              onChange={(e) => {
                const next = visual.datasets.slice();
                next[i] = { ...ds, label: e.target.value };
                onChange({ ...visual, datasets: next });
              }}
            />
          </label>
          <label>
            Data (comma separated)
            <input
              data-testid={`chart-editor-dataset-${i}-data`}
              value={ds.data.join(', ')}
              onChange={(e) => {
                const parsed = parseNumericList(e.target.value, ds.data);
                if (!parsed.ok) return; // reject edit, do not corrupt dataset length
                const next = visual.datasets.slice();
                next[i] = { ...ds, data: parsed.values };
                onChange({ ...visual, datasets: next });
              }}
            />
          </label>
        </fieldset>
      ))}
    </div>
  );
}

/**
 * Parse a comma-separated numeric edit. Returns `ok: false` if any cell is
 * present-but-unparseable (so the caller can reject the edit instead of
 * silently shortening the dataset). Empty cells fall back to the previous
 * value at that index, which lets the user delete a character mid-edit
 * without losing data.
 */
function parseNumericList(
  input: string,
  previous: number[],
): { ok: true; values: number[] } | { ok: false } {
  const cells = input.split(',').map((c) => c.trim());
  const values: number[] = [];
  for (let i = 0; i < cells.length; i += 1) {
    const cell = cells[i]!;
    if (cell === '') {
      values.push(previous[i] ?? 0);
      continue;
    }
    const n = Number(cell);
    if (!Number.isFinite(n)) return { ok: false };
    values.push(n);
  }
  return { ok: true, values };
}

function RawTab(props: {
  raw: string;
  jsonError: string | null;
  onRawChange: (v: string) => void;
  onBlur: () => void;
  print?: string;
  printHash?: string;
  onRegeneratePrint?: () => Promise<void>;
}): JSX.Element {
  return (
    <div className="chart-editor-raw">
      <textarea
        data-testid="chart-editor-raw"
        value={props.raw}
        onChange={(e) => props.onRawChange(e.target.value)}
        onBlur={props.onBlur}
        rows={16}
      />
      {props.jsonError && (
        <p className="chart-editor-error" role="alert">
          Invalid JSON: {props.jsonError}
        </p>
      )}
      <div className="chart-editor-print">
        <div>print: <code>{props.print ?? '(not set)'}</code></div>
        <div>printHash: <code>{props.printHash ?? '(not set)'}</code></div>
        {props.onRegeneratePrint && (
          <button type="button" onClick={() => void props.onRegeneratePrint!()}>
            Regenerate
          </button>
        )}
      </div>
    </div>
  );
}
