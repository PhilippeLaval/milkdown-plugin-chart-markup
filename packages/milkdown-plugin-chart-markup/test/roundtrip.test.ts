import { describe, expect, it } from 'vitest';
import { Editor, defaultValueCtx, rootCtx, serializerCtx, editorViewCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { chartMarkup, type ChartJsFactory } from '@philippe-laval/milkdown-plugin-chart-markup';

const stubFactory: ChartJsFactory = () => ({
  update: () => {},
  destroy: () => {},
  config: { type: 'bar', data: {} },
});

async function roundtrip(markdown: string): Promise<string> {
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
  const output = editor.action((ctx) => {
    const serializer = ctx.get(serializerCtx);
    const view = ctx.get(editorViewCtx);
    return serializer(view.state.doc);
  });
  await editor.destroy();
  return output.trimEnd();
}

const FIXTURES: Array<{ name: string; markdown: string }> = [
  {
    name: 'simple bar chart',
    markdown:
      '```chart\n' +
      JSON.stringify(
        {
          data: {
            datasets: [{ data: [1, 2, 3] }],
            labels: ['A', 'B', 'C'],
          },
          type: 'bar',
        },
        null,
        2,
      ) +
      '\n```',
  },
  {
    name: 'pie chart with custom options',
    markdown:
      '```chart\n' +
      JSON.stringify(
        {
          data: { datasets: [{ data: [10, 20, 30] }] },
          options: { plugins: { legend: { position: 'bottom' } } },
          type: 'pie',
        },
        null,
        2,
      ) +
      '\n```',
  },
  {
    name: 'chart with print and printHash',
    markdown:
      '```chart\n' +
      JSON.stringify(
        {
          data: { datasets: [{ data: [1] }] },
          type: 'line',
          print: 'https://cdn.example.com/chart.png',
          printHash: 'deadbeef',
        },
        null,
        2,
      ) +
      '\n```',
  },
  {
    name: 'chart with malformed body (preserved verbatim)',
    markdown: '```chart\nnot valid json\n```',
  },
];

describe('chartMarkup round-trip', () => {
  for (const fixture of FIXTURES) {
    it(`is lossless for ${fixture.name}`, async () => {
      const output = await roundtrip(fixture.markdown);
      expect(output).toBe(fixture.markdown);
    });
  }
});
