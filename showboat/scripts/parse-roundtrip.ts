import { readFileSync } from 'node:fs';
import { extractChartBlocks, serializeChartMarkup } from 'mdast-util-chart-markup';

const md = readFileSync('samples/01-basic-bar.md', 'utf8');
const [block] = extractChartBlocks(md);
if (!block || block.parsed.type !== 'chartMarkup') throw new Error('parse failed');

const canonical = serializeChartMarkup(block.parsed);
const reparsed = extractChartBlocks(canonical)[0]!.parsed;
if (reparsed.type !== 'chartMarkup') throw new Error('reparse failed');
const canonicalAgain = serializeChartMarkup(reparsed);

console.log(canonical);
console.log('---');
console.log('idempotent:', canonical === canonicalAgain);
