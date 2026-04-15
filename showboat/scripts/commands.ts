import {
  emptyState,
  insertChart,
  recordPrintResult,
  serializeBlock,
  updateChartConfig,
} from '@milkdown/plugin-chart-markup';
import { createDefaultChartConfig } from '@milkdown/plugin-chart-markup';

let state = emptyState();
state = insertChart(state, createDefaultChartConfig());
state = updateChartConfig(state, 0, {
  ...state.blocks[0]!.config,
  data: {
    labels: ['2024', '2025', '2026'],
    datasets: [{ label: 'ARR (€M)', data: [18, 32, 47] }],
  },
});
state = recordPrintResult(state, 0, 'https://cdn.example.com/rendered.png');

console.log(serializeBlock(state.blocks[0]!));
