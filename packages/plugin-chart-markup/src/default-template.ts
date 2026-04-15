import type { ChartConfig } from 'mdast-util-chart-markup';

/** The default bar chart template inserted by `Mod+Alt+C` and `/chart`. */
export function createDefaultChartConfig(): ChartConfig {
  return {
    type: 'bar',
    data: {
      labels: ['Label 1', 'Label 2', 'Label 3'],
      datasets: [{ label: 'Series 1', data: [0, 0, 0] }],
    },
    options: {
      plugins: { title: { display: true, text: 'Chart Title' } },
    },
  };
}
