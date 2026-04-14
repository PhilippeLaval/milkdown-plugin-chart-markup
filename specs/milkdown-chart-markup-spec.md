# milkdown-plugin-chart-markup — Developer Specification

> **Status:** Ready for implementation  
> **Modelled on:** [`milkdown-plugin-critic-markup`](https://github.com/PhilippeLaval/milkdown-plugin-critic-markup)  
> **Target:** Milkdown v7+, TypeScript, React

---

## 1. Purpose

This plugin adds first-class chart support to Milkdown editors. Charts are authored as fenced code blocks with the `chart` language tag containing a Chart.js configuration object. The plugin renders them live in the editor using Chart.js, and embeds a pre-rendered PNG URL (`print`) for PDF/PPTX export pipelines that cannot execute JavaScript at render time.

---

## 2. Markdown Syntax

### 2.1 Basic form

````markdown
```chart
{
  "type": "bar",
  "data": {
    "labels": ["Q1", "Q2", "Q3", "Q4"],
    "datasets": [{
      "label": "ARR (€M)",
      "data": [12, 23, 38, 45]
    }]
  },
  "options": {
    "plugins": {
      "title": { "display": true, "text": "Annual Recurring Revenue" }
    }
  }
}
```
````

### 2.2 With print URL (full form)

The `print` field is a top-level extension to the Chart.js config. It is ignored by Chart.js at runtime and used exclusively by the export pipeline.

````markdown
```chart
{
  "type": "bar",
  "data": { "..." },
  "options": { "..." },
  "print": "https://cdn.example.com/charts/abc123.png",
  "printHash": "sha256:7f3a9c..."
}
```
````

`printHash` is the SHA-256 of the Chart.js config **excluding** the `print` and `printHash` fields themselves. It allows consumers to detect config drift (user edited the JSON after the print URL was generated).

### 2.3 Supported Chart.js types

All built-in Chart.js v4 types are supported: `bar`, `line`, `pie`, `doughnut`, `radar`, `polarArea`, `bubble`, `scatter`. Additional types registered via `Chart.register()` (e.g. waterfall, candlestick via third-party plugins) are supported if the host application registers them before mounting the editor.

### 2.4 Serialization round-trip guarantee

The raw JSON in the fenced block must survive a parse → serialize cycle unchanged (whitespace-normalized, keys sorted within each object level). This is the same contract as `milkdown-plugin-critic-markup`: the markdown on disk is always authoritative.

---

## 3. Package Structure

Monorepo using **pnpm workspaces** and **Turborepo**, mirroring the CriticMarkup repo layout.

```
milkdown-plugin-chart-markup/
├── packages/
│   ├── micromark-extension-chart-markup/   # Tokenizer
│   ├── mdast-util-chart-markup/            # AST node + serializer
│   ├── plugin-chart-markup/                # Milkdown/ProseMirror plugin
│   └── plugin-chart-markup-react/          # React toolbar + editor panel
├── e2e/                                    # Playwright end-to-end tests
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.json
└── vitest.config.ts
```

### 3.1 `micromark-extension-chart-markup`

Extends micromark's fenced code block tokenizer. No custom tokenization is needed beyond recognizing `chart` as a known language tag and passing the block through to mdast-util verbatim. This package exists primarily to expose the language tag constant and provide a hook for future syntax extensions (e.g. `chart-yaml`).

**Exports:**
```ts
export const chartMarkupLanguageTag = 'chart';
export function chartMarkupMicromarkExtension(): Extension;
```

### 3.2 `mdast-util-chart-markup`

Converts raw fenced code blocks with `lang === 'chart'` into a typed `ChartMarkupNode` in the mdast tree, and serializes them back to markdown.

**Node type:**
```ts
interface ChartMarkupNode extends Literal {
  type: 'chartMarkup';
  lang: 'chart';
  value: string;         // raw JSON string (source of truth)
  config: ChartConfig;   // parsed Chart.js config (minus print fields)
  print?: string;        // S3/CDN URL of pre-rendered PNG
  printHash?: string;    // SHA-256 of config for drift detection
}
```

**Exports:**
```ts
export function chartMarkupFromMarkdown(): FromMarkdownExtension;
export function chartMarkupToMarkdown(): ToMarkdownExtension;
export function remarkChartMarkup(): unified.Plugin;
```

**Serialization rules:**
- Output is always a fenced code block with ` ```chart ` and ` ``` `.
- The JSON body is serialized with 2-space indentation, keys sorted alphabetically within each object level.
- `print` and `printHash` are included if present, placed as the last two keys.
- No trailing newline inside the fenced block.

### 3.3 `plugin-chart-markup` (core Milkdown plugin)

The main plugin. Registers a ProseMirror node type, defines parsing from mdast, serialization back to mdast, commands, and keyboard shortcuts.

**ProseMirror node spec:**
```ts
{
  group: 'block',
  atom: true,           // treated as a single unit by ProseMirror
  isolating: true,
  draggable: true,
  attrs: {
    config: { default: '{}' },   // raw JSON string
    print: { default: null },
    printHash: { default: null },
  }
}
```

**Node view:** A custom `NodeView` renders a `<div class="chart-markup-block">` containing a `<canvas>` managed by Chart.js. Chart.js instance lifecycle (create/destroy) is tied to the NodeView's `mount`/`destroy` callbacks.

**Commands:**
```ts
insertChart(config: ChartConfig): Command
updateChartConfig(pos: number, config: ChartConfig): Command
updateChartPrint(pos: number, print: string, printHash: string): Command
removeChart(pos: number): Command
```

**Keyboard shortcuts:**
| Shortcut | Action |
|---|---|
| `Mod+Alt+C` | Insert a blank chart block at cursor |
| `Escape` (when chart selected) | Deselect chart, return cursor to prose |
| `Backspace` / `Delete` (when chart selected) | Remove chart with confirmation |

**Plugin options:**
```ts
interface ChartMarkupPluginOptions {
  // Called when a chart block is created or its config is changed.
  // Host app uses this to trigger server-side PNG rendering.
  onChartChange?: (pos: number, config: ChartConfig) => Promise<{ print: string; printHash: string }>;

  // Default Chart.js options merged into every chart (for branding).
  defaultOptions?: DeepPartial<ChartOptions>;

  // If true, shows a drift warning badge when printHash doesn't match config.
  showDriftWarning?: boolean; // default: true
}
```

**Exports:**
```ts
export function chartMarkupPlugin(options?: ChartMarkupPluginOptions): MilkdownPlugin;
```

**Usage:**
```ts
import { Editor } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { chartMarkupPlugin } from '@milkdown/plugin-chart-markup';

Editor.make()
  .config(ctx => ctx.set(rootCtx, document.getElementById('editor')))
  .use(commonmark)
  .use(chartMarkupPlugin({
    defaultOptions: {
      plugins: { legend: { labels: { color: '#1a1a2e' } } }
    },
    onChartChange: async (pos, config) => {
      const res = await fetch('/api/charts/render', {
        method: 'POST',
        body: JSON.stringify(config),
      });
      return res.json(); // { print, printHash }
    },
  }))
  .create();
```

### 3.4 `plugin-chart-markup-react` (React UI layer)

Optional React components for the chart editing experience. Depends on `plugin-chart-markup`.

**Components:**

#### `ChartToolbar`

Floating toolbar that appears when a chart node is selected, positioned below the chart. Similar in pattern to the accept/reject toolbar in CriticMarkup.

```
┌────────────────────────────────────────────────────┐
│  [📊 Bar ▾]  [Edit config]  [Refresh print]  [🗑]  │
└────────────────────────────────────────────────────┘
```

- **Type selector:** Dropdown to change chart type (bar / line / pie / doughnut / radar). Changing type updates the `type` field in the JSON and re-renders in place.
- **Edit config:** Opens the `ChartEditorPanel` (see below).
- **Refresh print:** Manually triggers `onChartChange` to regenerate the print URL. Shown with a warning dot when `printHash` is stale.
- **Delete:** Removes the chart node. Shows a brief `Are you sure?` inline confirmation (same UX pattern as CriticMarkup reject).

#### `ChartEditorPanel`

Full editing panel, rendered as a floating popover or side panel (host app chooses via prop). Contains two tabs:

**Tab 1 — Visual editor**

A form-based editor for common chart properties. Avoids requiring the user to write JSON for simple changes.

Fields:
- Chart title (text input)
- Chart type (segmented control: Bar / Line / Pie / Doughnut / Radar)
- Labels (editable comma-separated list or tag input)
- Datasets: list of dataset rows, each with:
  - Label (text)
  - Data values (comma-separated numbers)
  - Color (color picker, defaults to theme color by index)
- X-axis label, Y-axis label (for bar/line)

Changes in the visual editor update the raw JSON in Tab 2 in real time.

**Tab 2 — Raw JSON**

A `<textarea>` (or CodeMirror instance if host app provides one via slot) showing the full Chart.js config JSON. Changes are validated on blur:
- If valid JSON: updates the visual editor in Tab 1 and re-renders the chart.
- If invalid JSON: shows inline error, does not update the chart.
- `print` and `printHash` fields are shown read-only, with a "Regenerate" button.

**Exports:**
```ts
export function useChartMarkupReact(): MilkdownPlugin;  // registers React node views

export interface ChartToolbarProps {
  editorPanelMode?: 'popover' | 'sidebar'; // default: 'popover'
}

export function ChartEditorPanel(props: {
  config: ChartConfig;
  print?: string;
  printHash?: string;
  onConfigChange: (config: ChartConfig) => void;
  onRegeneratePrint?: () => Promise<void>;
}): JSX.Element;
```

**Usage:**
```tsx
import { useEditor } from '@milkdown/react';
import { chartMarkupPlugin } from '@milkdown/plugin-chart-markup';
import { useChartMarkupReact } from '@milkdown/plugin-chart-markup-react';

const { get } = useEditor((root) =>
  Editor.make()
    .config(ctx => ctx.set(rootCtx, root))
    .use(commonmark)
    .use(chartMarkupPlugin({ onChartChange: renderChart }))
    .use(useChartMarkupReact())
);
```

---

## 4. UX Specification

### 4.1 Viewing state (no selection)

- Chart renders in a `<canvas>` inside a styled container block.
- Container has a subtle border and `8px` border-radius.
- A small `📊` badge in the top-right corner identifies it as a chart block.
- If `print` is set and `printHash` is stale (config changed after PNG was generated), a yellow `⚠ Print outdated` badge appears in the top-right corner.
- The chart is **not** editable in this state; clicks select the node.

### 4.2 Selected state

- The block gets a blue selection ring (matches ProseMirror's standard selected node style).
- The `ChartToolbar` floats below the block.
- Arrow keys move cursor out of the block into surrounding prose (standard ProseMirror `atom` behavior).

### 4.3 Editing state (ChartEditorPanel open)

- Popover mode: panel opens directly below the toolbar, ~400px wide.
- Sidebar mode: panel slides in from the right, host app controls width.
- Live preview: chart re-renders in the editor as the user types in the raw JSON tab (debounced 400ms). In visual editor tab, re-renders on every field change.
- On close (Escape or click outside): if config changed, changes are committed to the ProseMirror document and `onChartChange` is called.

### 4.4 Inserting a chart

**Via keyboard shortcut** (`Mod+Alt+C`): inserts a default bar chart template at the cursor position.

**Via slash command** (if host app uses Milkdown's slash plugin): register `/chart` as a slash command that inserts the same default template.

Default template:
```json
{
  "type": "bar",
  "data": {
    "labels": ["Label 1", "Label 2", "Label 3"],
    "datasets": [{ "label": "Series 1", "data": [0, 0, 0] }]
  },
  "options": {
    "plugins": { "title": { "display": true, "text": "Chart Title" } }
  }
}
```

After insertion, the `ChartEditorPanel` opens automatically so the user can immediately configure the chart.

### 4.5 Drag to resize

The chart container supports vertical resize via a drag handle at the bottom edge. The height is stored as `options.aspectRatio` in the Chart.js config (Chart.js uses aspect ratio, not fixed pixel height). The handle snaps to `aspectRatio` values `[0.5, 0.75, 1.0, 1.33, 1.77, 2.0]` (portrait → wide landscape).

### 4.6 Error states

| Condition | Display |
|---|---|
| Invalid JSON in block | Red border, `⚠ Invalid chart config` badge, raw JSON shown as `<pre>` fallback |
| Chart.js render error | Red border, error message from Chart.js shown below canvas |
| `print` URL broken (404) | Yellow badge `⚠ Print image unavailable` in export preview mode |
| `onChartChange` fails | Toast notification, `print` field not updated, editor remains functional |

---

## 5. Export Integration

### 5.1 The `print` contract

The `print` field in the JSON is a CDN/S3 URL of a PNG rendering of the chart at a standard resolution (default: **1600×900px @2x**, i.e., 800×450 logical). It is generated server-side (node-canvas or Puppeteer) and is the sole input used by PDF and PPTX export pipelines.

The plugin itself does **not** perform server-side rendering. It delegates to the host application via `onChartChange`. This keeps the plugin dependency-free from server infrastructure.

### 5.2 Drift detection

`printHash` = `sha256(JSON.stringify(config, sortedKeys))` where `config` excludes `print` and `printHash`. Any consumer (editor UI, export pipeline) can recompute the hash and compare to detect stale images.

### 5.3 Export-side consumption

For PDF/PPTX export, the document parser should:

1. Walk the mdast tree for `chartMarkup` nodes.
2. If `print` is present and `printHash` matches the computed hash of the config: use the PNG at `print`.
3. If `print` is absent or hash is stale: either trigger a fresh render or embed a placeholder image with a warning.
4. Substitute the `chartMarkup` node with an `image` node pointing to the PNG before handing off to the PDF/PPTX renderer.

---

## 6. Architecture

```
Markdown source
      │
      ▼
micromark-extension-chart-markup
  (recognizes ```chart fenced blocks, passes through verbatim)
      │
      ▼
mdast-util-chart-markup
  (converts to ChartMarkupNode, parses JSON, extracts print/printHash)
      │
      ▼
plugin-chart-markup
  (ProseMirror schema node, NodeView with Chart.js canvas, commands)
      │
      ▼
plugin-chart-markup-react  (optional)
  (ChartToolbar, ChartEditorPanel, React NodeView bridge)
```

Serialization is the reverse path. The canonical representation is always the raw JSON string in the fenced block — the ProseMirror `attrs.config` is derived from it, never the other way around.

---

## 7. Dependencies

### Runtime (peer deps of plugin-chart-markup)
```json
{
  "peerDependencies": {
    "@milkdown/core": ">=7.0.0",
    "@milkdown/preset-commonmark": ">=7.0.0",
    "chart.js": ">=4.0.0"
  }
}
```

### Runtime (peer deps of plugin-chart-markup-react)
```json
{
  "peerDependencies": {
    "@milkdown/react": ">=7.0.0",
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  }
}
```

### Dev / build
- pnpm, Turborepo
- Vite (for e2e dev app)
- Vitest (unit tests)
- Playwright (e2e tests)
- TypeScript ≥5.0

---

## 8. Test Plan

### 8.1 Unit tests (Vitest)

**mdast-util-chart-markup:**
- `parse → serialize` round-trip for all chart types
- `parse → serialize` preserves `print` and `printHash`
- Malformed JSON produces a graceful parse error node (not a crash)
- `printHash` computation is stable across key ordering

**plugin-chart-markup:**
- `insertChart` command inserts a node at cursor
- `updateChartConfig` updates `attrs.config` and triggers `onChartChange`
- `updateChartPrint` updates `print` and `printHash` without triggering `onChartChange`
- `removeChart` removes the node
- Keyboard shortcut `Mod+Alt+C` inserts default template

### 8.2 E2E tests (Playwright)

Mirrors the `e2e-proof.md` pattern from CriticMarkup.

**e2e-proof.md for chart markup:**

```markdown
# Chart Markup E2E Proof

## Basic bar chart

```chart
{
  "type": "bar",
  "data": {
    "labels": ["A", "B", "C"],
    "datasets": [{ "label": "Test", "data": [1, 2, 3] }]
  }
}
```

## With print URL

```chart
{
  "type": "line",
  "data": {
    "labels": ["X", "Y"],
    "datasets": [{ "label": "Series", "data": [10, 20] }]
  },
  "print": "https://example.com/chart.png",
  "printHash": "sha256:abc123"
}
```

## Invalid JSON — should render error state

```chart
{ this is not valid json
```
```

**E2E scenarios:**
- Chart canvas renders after editor mount
- Clicking chart selects node and shows toolbar
- Changing type via toolbar dropdown re-renders chart
- Opening editor panel, editing label, closes panel → markdown updated
- Drift warning appears when config edited but print not refreshed
- Invalid JSON block shows error state without crashing editor
- `Mod+Alt+C` inserts chart and auto-opens editor panel
- Serialized markdown from `editor.getMarkdown()` round-trips correctly

---

## 9. File Naming and npm Packages

| Package folder | npm name | Version |
|---|---|---|
| `micromark-extension-chart-markup` | `micromark-extension-chart-markup` | `0.1.0` |
| `mdast-util-chart-markup` | `mdast-util-chart-markup` | `0.1.0` |
| `plugin-chart-markup` | `@milkdown/plugin-chart-markup` | `0.1.0` |
| `plugin-chart-markup-react` | `@milkdown/plugin-chart-markup-react` | `0.1.0` |

---

## 10. Open Questions for Implementer

1. **CodeMirror in raw JSON tab?** The visual editor uses a plain `<textarea>` by default. If the host app (CoWrite) wants syntax highlighting in the JSON tab, it should inject a CodeMirror instance via a render prop / slot. Spec this as an optional `codeEditor` prop on `ChartEditorPanel`.

2. **YAML support?** A `chart-yaml` language tag (parsed via the `yaml` npm package into a Chart.js config) would improve authoring ergonomics. Defer to v0.2 to keep initial scope clean.

3. **Chart.js plugin registration?** The host app must register any third-party Chart.js plugins (waterfall, financial, etc.) before mounting the editor. Should the plugin expose a `registerChartPlugins` helper, or leave this entirely to the host? Recommend: leave to host, document clearly.

4. **Resize handle storage?** `aspectRatio` in `options` is the chosen approach but it may conflict with user-set `options.aspectRatio`. Consider a namespaced metadata field `"meta": { "aspectRatio": 1.77 }` stripped before passing to Chart.js.

---

## 11. Deliverables

- [ ] `micromark-extension-chart-markup` package
- [ ] `mdast-util-chart-markup` package with remark plugin
- [ ] `@milkdown/plugin-chart-markup` core plugin
- [ ] `@milkdown/plugin-chart-markup-react` React UI layer
- [ ] `e2e/` Playwright suite with `e2e-proof.md`
- [ ] `README.md` at repo root (same structure as CriticMarkup README)
- [ ] Published to npm under `@milkdown/` scope (or scoped to org)
- [ ] MIT License
