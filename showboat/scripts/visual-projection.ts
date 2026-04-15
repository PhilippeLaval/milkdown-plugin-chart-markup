import { readFileSync } from 'node:fs';
import { extractChartBlocks } from 'mdast-util-chart-markup';
import { configToVisual, visualToConfig } from '@milkdown/plugin-chart-markup-react';

const md = readFileSync('samples/01-basic-bar.md', 'utf8');
const [block] = extractChartBlocks(md);
if (!block || block.parsed.type !== 'chartMarkup') throw new Error('parse failed');

const visual = configToVisual(block.parsed.config);
console.log('visual projection:');
console.log(JSON.stringify(visual, null, 2));

const updated = { ...visual, title: 'Updated title from the visual editor' };
const newConfig = visualToConfig(updated, block.parsed.config);
console.log('--- after visual edit ---');
console.log(JSON.stringify((newConfig.options as any).plugins.title, null, 2));
