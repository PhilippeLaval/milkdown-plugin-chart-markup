# milkdown-plugin-chart-markup

A Milkdown plugin that adds first-class chart support via fenced ` ```chart ` code blocks containing Chart.js configuration. Renders live in the editor and embeds a pre-rendered PNG URL (`print`) for PDF/PPTX export pipelines.

> **Status:** In development — see [`specs/milkdown-chart-markup-spec.md`](specs/milkdown-chart-markup-spec.md) for the full developer specification.
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
| `@milkdown/plugin-chart-markup` | ProseMirror node, NodeView, commands |
| `@milkdown/plugin-chart-markup-react` | React toolbar and editor panel |

## License

MIT
