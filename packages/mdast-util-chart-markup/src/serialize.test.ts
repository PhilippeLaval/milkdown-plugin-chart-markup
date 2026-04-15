import { describe, expect, it } from 'vitest';
import { parseChartMarkup } from './parse.js';
import { canonicalizeChartMarkupBody, serializeChartMarkup } from './serialize.js';
import { CHART_MARKUP_NODE_TYPE, type ChartMarkupNode } from './types.js';

function parseOrThrow(raw: string): ChartMarkupNode {
  const n = parseChartMarkup(raw);
  if (n.type !== CHART_MARKUP_NODE_TYPE) throw new Error('parse failed');
  return n;
}

describe('serializeChartMarkup', () => {
  it('wraps canonical JSON in a chart fence', () => {
    const node = parseOrThrow(
      JSON.stringify({ type: 'bar', data: { datasets: [{ data: [1] }] } }),
    );
    const out = serializeChartMarkup(node);
    expect(out.startsWith('```chart\n')).toBe(true);
    expect(out.endsWith('\n```')).toBe(true);
  });

  it('parse → serialize round-trip yields canonical form for every chart type', () => {
    const types = ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea', 'bubble', 'scatter'];
    for (const type of types) {
      const input = JSON.stringify({
        type,
        data: {
          labels: ['x', 'y'],
          datasets: [{ label: 'd', data: [1, 2] }],
        },
      });
      const node = parseOrThrow(input);
      const once = serializeChartMarkup(node);
      const twice = serializeChartMarkup(parseOrThrow(once.replace(/^```chart\n|\n```$/g, '')));
      expect(twice).toBe(once);
    }
  });

  it('preserves print and printHash, placing them last', () => {
    const raw = JSON.stringify({
      type: 'bar',
      data: { datasets: [{ data: [1] }] },
      print: 'https://cdn.example.com/x.png',
      printHash: 'sha256:abc',
    });
    const node = parseOrThrow(raw);
    const out = serializeChartMarkup(node);
    const body = out.replace(/^```chart\n|\n```$/g, '');
    const keys = Object.keys(JSON.parse(body));
    expect(keys[keys.length - 2]).toBe('print');
    expect(keys[keys.length - 1]).toBe('printHash');
  });

  it('canonicalizeChartMarkupBody sorts and places print fields last', () => {
    const out = canonicalizeChartMarkupBody(
      JSON.stringify({
        printHash: 'sha256:x',
        print: 'https://y',
        type: 'bar',
        data: { datasets: [{ data: [1] }] },
      }),
    );
    const keys = Object.keys(JSON.parse(out));
    expect(keys).toEqual(['data', 'type', 'print', 'printHash']);
  });
});
