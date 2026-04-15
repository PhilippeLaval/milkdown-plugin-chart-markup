import { readFileSync } from 'node:fs';
import { extractChartBlocks } from 'mdast-util-chart-markup';

const md = readFileSync('samples/04-invalid-json.md', 'utf8');
const blocks = extractChartBlocks(md);

for (const [i, b] of blocks.entries()) {
  if (b.parsed.type === 'chartMarkup') {
    console.log(`block ${i}: ok (type=${b.parsed.config.type})`);
  } else {
    console.log(`block ${i}: error → ${b.parsed.error}`);
  }
}
console.log('the parser never throws — the editor renders a red error badge for broken blocks.');
