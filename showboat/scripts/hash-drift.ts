import { readFileSync } from 'node:fs';
import {
  computePrintHash,
  extractChartBlocks,
  isPrintDrifted,
  type ChartMarkupValue,
} from 'mdast-util-chart-markup';

const md = readFileSync('samples/03-with-print-url.md', 'utf8');
const [block] = extractChartBlocks(md);
if (!block || block.parsed.type !== 'chartMarkup') throw new Error('parse failed');

const node = block.parsed;
const stored = node.printHash!;
const recomputed = computePrintHash(node.config);

console.log('print URL:      ', node.print);
console.log('stored hash:    ', stored);
console.log('recomputed hash:', recomputed);
console.log(
  'drift detected: ',
  isPrintDrifted({ ...node.config, print: node.print, printHash: node.printHash } as ChartMarkupValue),
);

// Now "regenerate" the print by attaching the recomputed hash and re-check.
const regenerated: ChartMarkupValue = {
  ...node.config,
  print: node.print,
  printHash: recomputed,
};
console.log('after regen:    ', isPrintDrifted(regenerated) ? 'still drifted' : 'clean');
