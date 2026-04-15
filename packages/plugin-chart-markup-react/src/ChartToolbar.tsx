import { useState } from 'react';
import type { ChartConfig } from 'mdast-util-chart-markup';

export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'radar';

export interface ChartToolbarProps {
  config: ChartConfig;
  driftWarning?: boolean;
  onTypeChange: (type: ChartType) => void;
  onEditConfig: () => void;
  onRefreshPrint?: () => void;
  onDelete: () => void;
}

const CHART_TYPES: ChartType[] = ['bar', 'line', 'pie', 'doughnut', 'radar'];

/**
 * Floating toolbar surfaced when a chart is selected. Deletion uses a two-step
 * inline confirmation (matches the CriticMarkup accept/reject pattern) so the
 * user never loses a chart to an accidental click.
 */
export function ChartToolbar(props: ChartToolbarProps): JSX.Element {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="chart-toolbar" data-testid="chart-toolbar" role="toolbar">
      <label>
        <span className="sr-only">Chart type</span>
        <select
          data-testid="chart-toolbar-type"
          value={(CHART_TYPES as string[]).includes(props.config.type)
            ? (props.config.type as ChartType)
            : 'bar'}
          onChange={(e) => props.onTypeChange(e.target.value as ChartType)}
        >
          {CHART_TYPES.map((t) => (
            <option key={t} value={t}>
              📊 {t}
            </option>
          ))}
        </select>
      </label>

      <button type="button" data-testid="chart-toolbar-edit" onClick={props.onEditConfig}>
        Edit config
      </button>

      {props.onRefreshPrint && (
        <button type="button" data-testid="chart-toolbar-refresh" onClick={props.onRefreshPrint}>
          Refresh print {props.driftWarning && <span aria-label="drift warning">●</span>}
        </button>
      )}

      {confirming ? (
        <span className="chart-toolbar-confirm">
          Are you sure?
          <button
            type="button"
            data-testid="chart-toolbar-confirm-delete"
            onClick={() => {
              setConfirming(false);
              props.onDelete();
            }}
          >
            Yes, delete
          </button>
          <button type="button" onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          data-testid="chart-toolbar-delete"
          onClick={() => setConfirming(true)}
          aria-label="Delete chart"
        >
          🗑
        </button>
      )}
    </div>
  );
}
