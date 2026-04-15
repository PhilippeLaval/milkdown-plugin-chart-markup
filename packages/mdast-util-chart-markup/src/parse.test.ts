import { describe, expect, it } from 'vitest';
import { canonicalizeChartBody, extractChartBlocks, parseChartMarkup } from './parse.js';
import { CHART_MARKUP_ERROR_TYPE, CHART_MARKUP_NODE_TYPE } from './types.js';

const validRaw = JSON.stringify({
  type: 'bar',
  data: {
    labels: ['A', 'B', 'C'],
    datasets: [{ label: 'Test', data: [1, 2, 3] }],
  },
});

describe('parseChartMarkup', () => {
  it('produces a chartMarkup node for valid input', () => {
    const node = parseChartMarkup(validRaw);
    expect(node.type).toBe(CHART_MARKUP_NODE_TYPE);
    if (node.type !== CHART_MARKUP_NODE_TYPE) return;
    expect(node.lang).toBe('chart');
    expect(node.config.type).toBe('bar');
    expect(node.print).toBeUndefined();
  });

  it('extracts print and printHash into top-level fields', () => {
    const raw = JSON.stringify({
      type: 'line',
      data: { datasets: [{ data: [1] }] },
      print: 'https://cdn.example.com/x.png',
      printHash: 'sha256:abc123',
    });
    const node = parseChartMarkup(raw);
    if (node.type !== CHART_MARKUP_NODE_TYPE) throw new Error('expected success node');
    expect(node.print).toBe('https://cdn.example.com/x.png');
    expect(node.printHash).toBe('sha256:abc123');
    expect(node.config).not.toHaveProperty('print');
    expect(node.config).not.toHaveProperty('printHash');
  });

  it('returns an error node for invalid JSON without throwing', () => {
    const node = parseChartMarkup('{ this is not valid json');
    expect(node.type).toBe(CHART_MARKUP_ERROR_TYPE);
    if (node.type !== CHART_MARKUP_ERROR_TYPE) return;
    expect(node.error).toMatch(/Invalid JSON/);
  });

  it('returns an error node for missing required fields', () => {
    expect(parseChartMarkup('{}').type).toBe(CHART_MARKUP_ERROR_TYPE);
    expect(parseChartMarkup('{"type":"bar"}').type).toBe(CHART_MARKUP_ERROR_TYPE);
    expect(
      parseChartMarkup('{"type":"bar","data":{"datasets":"not-an-array"}}').type,
    ).toBe(CHART_MARKUP_ERROR_TYPE);
  });

  it('rejects arrays and non-object roots', () => {
    expect(parseChartMarkup('[]').type).toBe(CHART_MARKUP_ERROR_TYPE);
    expect(parseChartMarkup('"string"').type).toBe(CHART_MARKUP_ERROR_TYPE);
  });

  it('strictType flag rejects unknown chart types', () => {
    const raw = JSON.stringify({
      type: 'waterfall',
      data: { datasets: [{ data: [1] }] },
    });
    expect(parseChartMarkup(raw, { strictType: true }).type).toBe(CHART_MARKUP_ERROR_TYPE);
    expect(parseChartMarkup(raw).type).toBe(CHART_MARKUP_NODE_TYPE);
  });
});

describe('extractChartBlocks', () => {
  it('finds chart blocks interleaved with prose', () => {
    const md = [
      '# Title',
      '',
      'Some prose.',
      '',
      '```chart',
      validRaw,
      '```',
      '',
      '```js',
      'console.log("not a chart")',
      '```',
      '',
      '```chart',
      JSON.stringify({ type: 'line', data: { datasets: [{ data: [4, 5] }] } }),
      '```',
      '',
    ].join('\n');

    const blocks = extractChartBlocks(md);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]!.parsed.type).toBe(CHART_MARKUP_NODE_TYPE);
    expect(blocks[1]!.parsed.type).toBe(CHART_MARKUP_NODE_TYPE);
  });

  it('extracts charts inside blockquotes', () => {
    const md = [
      '> Some intro',
      '> ',
      '> ```chart',
      '> ' + validRaw,
      '> ```',
      '',
    ].join('\n');
    const blocks = extractChartBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.parsed.type).toBe(CHART_MARKUP_NODE_TYPE);
  });

  it('extracts charts inside unordered list items', () => {
    const md = [
      '- Item with a chart',
      '  ```chart',
      '  ' + validRaw,
      '  ```',
    ].join('\n');
    const blocks = extractChartBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.parsed.type).toBe(CHART_MARKUP_NODE_TYPE);
  });

  it('ignores fences inside an indented code block (4+ spaces)', () => {
    const md = [
      'Here is an example of chart markup:',
      '',
      '    ```chart',
      '    ' + validRaw,
      '    ```',
      '',
      'End of example.',
    ].join('\n');
    const blocks = extractChartBlocks(md);
    expect(blocks).toHaveLength(0);
  });

  it('still accepts a fence with up to 3 spaces of leading indentation', () => {
    const md = ['   ```chart', '   ' + validRaw, '   ```', ''].join('\n');
    const blocks = extractChartBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.parsed.type).toBe(CHART_MARKUP_NODE_TYPE);
  });

  it('extracts charts inside ordered list items', () => {
    const md = [
      '1. First',
      '   ```chart',
      '   ' + validRaw,
      '   ```',
    ].join('\n');
    const blocks = extractChartBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.parsed.type).toBe(CHART_MARKUP_NODE_TYPE);
  });

  it('returns an error block for malformed JSON inside a chart fence', () => {
    const md = ['```chart', '{ bad', '```'].join('\n');
    const blocks = extractChartBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.parsed.type).toBe(CHART_MARKUP_ERROR_TYPE);
  });
});

describe('canonicalizeChartBody', () => {
  it('is idempotent', () => {
    const once = canonicalizeChartBody(validRaw);
    const twice = canonicalizeChartBody(once);
    expect(twice).toBe(once);
  });
});
