import { describe, expect, it, vi } from 'vitest';
import { computePrintHash } from 'mdast-util-chart-markup';
import { renderChartBlocksForPrint, renderChartBlocksAsImages } from './print.js';
import type { ChartJsFactory, PrintOptions } from './types.js';

const FAKE_PNG = 'data:image/png;base64,RENDERED';

function fakePrintOptions(): PrintOptions {
  const chartFactory: ChartJsFactory = (_canvas, _config) => ({
    toBase64Image: () => FAKE_PNG,
    destroy: vi.fn(),
  });
  return { chartFactory };
}

const singleChartMd = `# Report

\`\`\`chart
{
  "type": "bar",
  "data": {
    "labels": ["Q1", "Q2"],
    "datasets": [{ "label": "ARR", "data": [10, 20] }]
  }
}
\`\`\`

Some text after.`;

const twoChartsMd = `# Report

\`\`\`chart
{
  "type": "bar",
  "data": {
    "labels": ["A"],
    "datasets": [{ "label": "First", "data": [1] }]
  }
}
\`\`\`

Middle paragraph.

\`\`\`chart
{
  "type": "line",
  "data": {
    "labels": ["X"],
    "datasets": [{ "label": "Second", "data": [2] }]
  }
}
\`\`\`

End.`;

const invalidChartMd = `# Bad

\`\`\`chart
{ not valid json
\`\`\`

After.`;

describe('renderChartBlocksForPrint', () => {
  it('updates print and printHash in a single chart block', () => {
    const result = renderChartBlocksForPrint(singleChartMd, fakePrintOptions());
    expect(result).toContain('"print": "data:image/png;base64,RENDERED"');
    expect(result).toContain('"printHash": "sha256:');
    expect(result).toContain('```chart');
    expect(result).toContain('```');
    expect(result).toContain('Some text after.');
  });

  it('preserves the original config fields', () => {
    const result = renderChartBlocksForPrint(singleChartMd, fakePrintOptions());
    expect(result).toContain('"type": "bar"');
    expect(result).toContain('"labels"');
    expect(result).toContain('"ARR"');
  });

  it('produces a correct printHash', () => {
    const result = renderChartBlocksForPrint(singleChartMd, fakePrintOptions());
    const config = { type: 'bar', data: { labels: ['Q1', 'Q2'], datasets: [{ label: 'ARR', data: [10, 20] }] } };
    const expectedHash = computePrintHash(config);
    expect(result).toContain(`"printHash": "${expectedHash}"`);
  });

  it('handles multiple chart blocks', () => {
    const result = renderChartBlocksForPrint(twoChartsMd, fakePrintOptions());
    const printCount = (result.match(/"print":/g) ?? []).length;
    expect(printCount).toBe(2);
    expect(result).toContain('Middle paragraph.');
    expect(result).toContain('End.');
  });

  it('leaves invalid chart blocks untouched', () => {
    const result = renderChartBlocksForPrint(invalidChartMd, fakePrintOptions());
    expect(result).toBe(invalidChartMd);
  });

  it('returns markdown unchanged when no chart blocks exist', () => {
    const plain = '# Hello\n\nJust text.';
    expect(renderChartBlocksForPrint(plain, fakePrintOptions())).toBe(plain);
  });
});

describe('renderChartBlocksAsImages', () => {
  it('replaces a chart block with a markdown image tag', () => {
    const result = renderChartBlocksAsImages(singleChartMd, fakePrintOptions());
    expect(result).toContain('![bar chart: ARR](data:image/png;base64,RENDERED)');
    expect(result).not.toContain('```chart');
    expect(result).toContain('Some text after.');
  });

  it('replaces multiple chart blocks', () => {
    const result = renderChartBlocksAsImages(twoChartsMd, fakePrintOptions());
    expect(result).toContain('![bar chart: First]');
    expect(result).toContain('![line chart: Second]');
    expect(result).not.toContain('```chart');
  });

  it('uses generic alt text for multi-dataset charts', () => {
    const multiDatasetMd = `\`\`\`chart
{
  "type": "bar",
  "data": {
    "labels": ["A"],
    "datasets": [
      { "label": "X", "data": [1] },
      { "label": "Y", "data": [2] }
    ]
  }
}
\`\`\``;
    const result = renderChartBlocksAsImages(multiDatasetMd, fakePrintOptions());
    expect(result).toContain('![bar chart]');
  });

  it('escapes parentheses in dataset labels so the image tag stays valid', () => {
    const md = `\`\`\`chart
{
  "type": "bar",
  "data": {
    "labels": ["Q1"],
    "datasets": [{ "label": "ARR (€M)", "data": [12] }]
  }
}
\`\`\``;
    const result = renderChartBlocksAsImages(md, fakePrintOptions());
    expect(result).toContain('![bar chart: ARR \\(€M\\)](data:image/png;base64,RENDERED)');
  });

  it('leaves invalid chart blocks untouched', () => {
    const result = renderChartBlocksAsImages(invalidChartMd, fakePrintOptions());
    expect(result).toBe(invalidChartMd);
  });

  it('returns markdown unchanged when no chart blocks exist', () => {
    const plain = '# Hello\n\nJust text.';
    expect(renderChartBlocksAsImages(plain, fakePrintOptions())).toBe(plain);
  });
});
