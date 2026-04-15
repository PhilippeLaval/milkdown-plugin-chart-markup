# @philippe-laval/milkdown-plugin-chart-markup

Turn-key [Milkdown](https://milkdown.dev) plugin that adds first-class chart
blocks, backed by a canonical `` ```chart `` fenced-code markdown representation.

A host `.use()`s the plugin and gets parsing, serializing, schema, node view,
and keymap wired up end-to-end — no ProseMirror, micromark, mdast, or
`@milkdown/utils` knowledge required.

## Install

```bash
pnpm add @philippe-laval/milkdown-plugin-chart-markup \
  @milkdown/core @milkdown/preset-commonmark chart.js
```

## Read-only viewer

```ts
import { Editor, defaultValueCtx, rootCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { chartMarkup } from '@philippe-laval/milkdown-plugin-chart-markup';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

await Editor.make()
  .config((ctx) => {
    ctx.set(rootCtx, host);
    ctx.set(defaultValueCtx, markdown);
  })
  .use(commonmark)
  .use(
    chartMarkup({
      chartFactory: (canvas, config) => new Chart(canvas, config as never) as never,
      readOnly: true,
    }),
  )
  .create();
```

## Editable host

```ts
await Editor.make()
  .config((ctx) => {
    ctx.set(rootCtx, host);
    ctx.set(defaultValueCtx, markdown);
  })
  .use(commonmark)
  .use(
    chartMarkup({
      chartFactory: (canvas, config) => new Chart(canvas, config as never) as never,
      onChartChange: async (pos, config) => {
        const { print, printHash } = await renderPrintOnServer(pos, config);
        return { print, printHash };
      },
    }),
  )
  .create();
```

`Mod-Alt-c` inserts a default chart block at the selection.

## Chart.js setup

This package does not call `Chart.register(...)` — the host is responsible for
registering the controllers, elements, and plugins it needs before mounting
the editor. Typical minimal setup:

```ts
import { Chart, BarController, BarElement, LinearScale, CategoryScale } from 'chart.js';
Chart.register(BarController, BarElement, LinearScale, CategoryScale);
```

Or, to register everything, `Chart.register(...registerables)`.

## What this package does vs `@philippe-laval/plugin-chart-markup`

- `@philippe-laval/plugin-chart-markup` — editor-agnostic **primitives**: the
  raw ProseMirror node spec, keymap binding table, default chart template,
  pure command layer, and the `mountChartNodeView` DOM mount helper. Use this
  directly if you are building a non-Milkdown host (bare ProseMirror, Lexical,
  TipTap, etc.) or need fine-grained control.
- `@philippe-laval/milkdown-plugin-chart-markup` — **this package**. A thin
  adapter that wraps the primitives into a Milkdown `MilkdownPlugin[]` you
  drop into `Editor.make().use(...)`. Use this if your host is Milkdown.

The adapter intentionally ships **no host UI** — no toolbars, no edit dialogs,
no chart-type pickers. Those belong in the host app or a separate
`@philippe-laval/plugin-chart-markup-react` package.
