import { describe, expect, it } from 'vitest';
import { Editor, defaultValueCtx, editorViewCtx, rootCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { chartMarkup, type ChartJsFactory } from '@philippe-laval/milkdown-plugin-chart-markup';
import { CHART_MARKUP_NODE_TYPE, canonicalStringify, parseChartMarkup } from 'mdast-util-chart-markup';

// A no-op Chart.js factory so the node view can mount without a real Chart
// runtime. The lifecycle methods match `ChartJsLike`.
const stubFactory: ChartJsFactory = () => ({
  update: () => {},
  destroy: () => {},
  config: { type: 'bar', data: {} },
});

const MARKDOWN_WITH_CHART = `# Charts demo

\`\`\`chart
{
  "type": "bar",
  "data": {
    "labels": ["A", "B"],
    "datasets": [{ "data": [1, 2] }]
  }
}
\`\`\`

After.`;

async function makeEditor(markdown: string) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, host);
      ctx.set(defaultValueCtx, markdown);
    })
    .use(commonmark)
    .use(chartMarkup({ chartFactory: stubFactory, readOnly: true }))
    .create();
  return { editor, host };
}

describe('chartMarkup parseMarkdown', () => {
  it('produces a chartMarkup node from a ```chart fenced block', async () => {
    const { editor } = await makeEditor(MARKDOWN_WITH_CHART);
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const chartNodes: Array<{ config: string }> = [];
      view.state.doc.descendants((node) => {
        if (node.type.name === 'chartMarkup') {
          chartNodes.push({ config: node.attrs.config as string });
          return false;
        }
        return true;
      });
      expect(chartNodes).toHaveLength(1);
      const parsed = parseChartMarkup(chartNodes[0]!.config);
      expect(parsed.type).toBe(CHART_MARKUP_NODE_TYPE);
      if (parsed.type === CHART_MARKUP_NODE_TYPE) {
        expect(parsed.config.type).toBe('bar');
        expect(parsed.config.data.datasets).toHaveLength(1);
        // Config is stored in canonical stringified form.
        expect(chartNodes[0]!.config).toBe(canonicalStringify(parsed.config));
      }
    });
    await editor.destroy();
  });

  it('preserves print and printHash attributes when present', async () => {
    const markdown = `\`\`\`chart
{
  "type": "pie",
  "data": { "datasets": [{ "data": [1, 2, 3] }] },
  "print": "https://cdn.example.com/p.png",
  "printHash": "abcdef"
}
\`\`\``;
    const { editor } = await makeEditor(markdown);
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      let found: { print: unknown; printHash: unknown } | null = null;
      view.state.doc.descendants((node) => {
        if (node.type.name === 'chartMarkup') {
          found = { print: node.attrs.print, printHash: node.attrs.printHash };
          return false;
        }
        return true;
      });
      expect(found).toEqual({
        print: 'https://cdn.example.com/p.png',
        printHash: 'abcdef',
      });
    });
    await editor.destroy();
  });
});
