# milkdown-plugin-chart-markup

A Milkdown plugin that adds first-class chart support via fenced ` ```chart ` code blocks containing Chart.js configuration. Renders live in the editor and embeds a pre-rendered PNG URL (`print`) for PDF/PPTX export pipelines.

> **Status:** v0.1.0 first version — 4 packages, Vite+React playground, 65 unit tests and 7 hand-to-hand Playwright tests. See [`specs/milkdown-chart-markup-spec.md`](specs/milkdown-chart-markup-spec.md) for the full developer specification.
> **Modelled on:** [`milkdown-plugin-critic-markup`](https://github.com/PhilippeLaval/milkdown-plugin-critic-markup)
> **Target:** Milkdown v7+, TypeScript, React

## Syntax

````markdown
```chart
{
  "type": "bar",
  "data": {
    "labels": ["Q1", "Q2", "Q3", "Q4"],
    "datasets": [{ "label": "ARR (€M)", "data": [12, 23, 38, 45] }]
  }
}
```
````

Optional top-level `print` (CDN URL of a pre-rendered PNG) and `printHash` (SHA-256 of the config, excluding those two fields) enable drift detection for export pipelines that cannot execute JavaScript.

## Packages

Monorepo (pnpm workspaces + Turborepo):

| Package | Purpose |
|---|---|
| `micromark-extension-chart-markup` | Tokenizer — recognizes the `chart` language tag |
| `mdast-util-chart-markup` | AST node + serializer, with a remark plugin |
| `@philippe-laval/plugin-chart-markup` | ProseMirror node, NodeView, commands |
| `@philippe-laval/plugin-chart-markup-react` | React toolbar and editor panel |

## Getting started

```bash
pnpm install
pnpm playground      # Vite dev server on http://localhost:5173
pnpm test            # 65 Vitest unit tests
pnpm test:e2e        # 7 Playwright hand-to-hand tests (boots the playground)
pnpm showboat:verify # re-run the executable walkthrough at showboat/walkthrough.md
```

## Playground

`playground/` is a Vite + React app that loads four sample documents from `samples/`, renders their chart blocks live with Chart.js, and lets you edit the markdown source in a textarea to see the charts re-render.

| Sample | Covers |
|---|---|
| `samples/01-basic-bar.md` | Basic bar chart |
| `samples/02-multi-chart-report.md` | Three independent charts in one doc (line / doughnut / bar) |
| `samples/03-with-print-url.md` | `print` URL + intentionally-stale `printHash` to show the drift warning |
| `samples/04-invalid-json.md` | Malformed JSON rendered as an inline error state |

## Tests

- **Unit:** 65 Vitest tests across all four packages — canonical stringifier, pure SHA-256, parse/serialize round-trip, drift detection, pure command layer, node-view DOM, React visual↔config projection.
- **Hand-to-hand:** 7 Playwright tests in `e2e/` drive the playground in Chromium: sample loading, three-chart rendering, drift badge, error state, live textarea edits, sample switching, toolbar presence.
- **Walkthrough:** `showboat/walkthrough.md` is an executable demo document. `pnpm showboat:verify` re-runs every code block and diffs the output.

## License

MIT
