import { describe, expect, it } from 'vitest';
import { chartMarkupFromMarkdown, chartMarkupToMarkdown, remarkChartMarkup } from './remark.js';
import { CHART_MARKUP_NODE_TYPE } from './types.js';

const validBody = JSON.stringify({
  type: 'bar',
  data: { datasets: [{ data: [1, 2, 3] }] },
});

describe('remarkChartMarkup', () => {
  it('upgrades chart code nodes into chartMarkup nodes', () => {
    const tree = {
      type: 'root' as const,
      children: [
        { type: 'code', lang: 'chart', value: validBody },
        { type: 'code', lang: 'js', value: 'console.log("skip")' },
      ],
    };
    remarkChartMarkup()(tree);
    expect(tree.children[0]!.type).toBe(CHART_MARKUP_NODE_TYPE);
    expect(tree.children[1]!.type).toBe('code');
  });

  it('leaves invalid chart blocks as plain code nodes (editor falls back)', () => {
    const tree = {
      type: 'root' as const,
      children: [{ type: 'code', lang: 'chart', value: '{ bad' }],
    };
    remarkChartMarkup()(tree);
    expect(tree.children[0]!.type).toBe('code');
  });

  it('recursively upgrades charts nested inside list items and blockquotes', () => {
    const tree = {
      type: 'root' as const,
      children: [
        {
          type: 'blockquote',
          children: [{ type: 'code', lang: 'chart', value: validBody }],
        },
        {
          type: 'list',
          children: [
            {
              type: 'listItem',
              children: [{ type: 'code', lang: 'chart', value: validBody }],
            },
          ],
        },
      ],
    };
    remarkChartMarkup()(tree as any);
    expect((tree as any).children[0].children[0].type).toBe(CHART_MARKUP_NODE_TYPE);
    expect((tree as any).children[1].children[0].children[0].type).toBe(CHART_MARKUP_NODE_TYPE);
  });

  it('exposes from/to markdown factories with the expected shape', () => {
    expect(typeof chartMarkupFromMarkdown().transforms[0]).toBe('function');
    expect(chartMarkupToMarkdown().handlers).toHaveProperty(CHART_MARKUP_NODE_TYPE);
  });
});
