import basicBar from '../../samples/01-basic-bar.md?raw';
import multiReport from '../../samples/02-multi-chart-report.md?raw';
import withPrint from '../../samples/03-with-print-url.md?raw';
import invalidJson from '../../samples/04-invalid-json.md?raw';
import annualDashboard from '../../samples/05-annual-dashboard.md?raw';
import novadisplay from '../../samples/06-novadisplay-briefing.md?raw';

export interface Sample {
  id: string;
  title: string;
  source: string;
}

export const SAMPLES: Sample[] = [
  { id: 'basic-bar', title: '01 · Basic bar chart', source: basicBar },
  { id: 'multi-report', title: '02 · Multi-chart report', source: multiReport },
  { id: 'with-print', title: '03 · Chart with print URL', source: withPrint },
  { id: 'invalid-json', title: '04 · Invalid JSON — error state', source: invalidJson },
  { id: 'annual-dashboard', title: '05 · Annual performance dashboard', source: annualDashboard },
  { id: 'novadisplay', title: '06 · NovaDisplay briefing', source: novadisplay },
];
