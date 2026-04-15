# milkdown-plugin-chart-markup — capabilities walkthrough

*2026-04-14T14:08:56Z by Showboat 0.6.1*
<!-- showboat-id: ed11ff0a-de3d-4ddc-b3aa-af9902aae304 -->

This walkthrough demonstrates the **milkdown-plugin-chart-markup** plugin end-to-end. Every code block below is executed by showboat and its output captured — run `npx showboat verify showboat/walkthrough.md` to re-run them and confirm the plugin still behaves as documented.

## 1. Monorepo layout

```bash
ls packages/ && echo --- && ls samples/
```

```output
mdast-util-chart-markup
micromark-extension-chart-markup
plugin-chart-markup
plugin-chart-markup-react
---
01-basic-bar.md
02-multi-chart-report.md
03-with-print-url.md
04-invalid-json.md
```

## 2. Parse and serialize are a stable round-trip

The raw JSON inside the fenced chart block is the source of truth. Parsing it with `parseChartMarkup` and serializing the resulting node with `serializeChartMarkup` yields the canonical form — keys sorted alphabetically at every depth, indentation normalized. Running the pipeline twice produces the same bytes.

```bash
npx tsx showboat/scripts/parse-roundtrip.ts
```

````output
```chart
{
  "data": {
    "datasets": [
      {
        "data": [
          12,
          23,
          38,
          45
        ],
        "label": "ARR (€M)"
      }
    ],
    "labels": [
      "Q1",
      "Q2",
      "Q3",
      "Q4"
    ]
  },
  "options": {
    "plugins": {
      "title": {
        "display": true,
        "text": "Annual Recurring Revenue"
      }
    }
  },
  "type": "bar"
}
```
---
idempotent: true
````

## 3. Drift detection via printHash

The `print` field points at a pre-rendered PNG that export pipelines (PDF/PPTX) consume. `printHash` is a SHA-256 over the canonical JSON with `print`/`printHash` stripped. If the user edits the JSON after the PNG was generated, the stored hash no longer matches the recomputed one and the editor surfaces a yellow `⚠ Print outdated` badge.

The script below loads `samples/03-with-print-url.md` (whose `printHash` is intentionally stale) and shows drift detection in action.

```bash
npx tsx showboat/scripts/hash-drift.ts
```

```output
print URL:       https://cdn.example.com/charts/radar-abc123.png
stored hash:     sha256:replace-me-at-render-time
recomputed hash: sha256:57954cecae1f80fd308cadc87683e6bc09fba4bb2528df75b58ec69f6939991a
drift detected:  true
after regen:     clean
```

## 4. Error recovery — invalid JSON never kills the editor

Malformed JSON produces a `chartMarkupError` node instead of throwing. The surrounding markdown document keeps rendering and only the broken block shows a red error badge.

```bash
npx tsx showboat/scripts/error-recovery.ts
```

```output
block 0: error → Invalid JSON: Expected property name or '}' in JSON at position 2 (line 1 column 3)
block 1: ok (type=pie)
the parser never throws — the editor renders a red error badge for broken blocks.
```

## 5. Editor commands produce canonical markdown

The `@milkdown/plugin-chart-markup` package exposes pure commands operating on a document-shaped state. Below: insert the default chart template, edit its dataset, record a `print` URL returned by the host's renderer, and serialize back to canonical markdown.

```bash
npx tsx showboat/scripts/commands.ts
```

```output
{
  "data": {
    "datasets": [
      {
        "data": [
          18,
          32,
          47
        ],
        "label": "ARR (€M)"
      }
    ],
    "labels": [
      "2024",
      "2025",
      "2026"
    ]
  },
  "options": {
    "plugins": {
      "title": {
        "display": true,
        "text": "Chart Title"
      }
    }
  },
  "type": "bar",
  "print": "https://cdn.example.com/rendered.png",
  "printHash": "sha256:375a0266550db31329365ee4287baa65e6eccd07c0157f6daf49eee0631525c4"
}
```

## 6. Visual ↔ JSON projection for the React panel

The React package ships a form-based visual editor that projects a ChartConfig into a flat model and back. The projection deliberately preserves unknown Chart.js options so the raw JSON tab always remains authoritative.

```bash
npx tsx showboat/scripts/visual-projection.ts
```

```output
visual projection:
{
  "title": "Annual Recurring Revenue",
  "type": "bar",
  "labels": [
    "Q1",
    "Q2",
    "Q3",
    "Q4"
  ],
  "datasets": [
    {
      "label": "ARR (€M)",
      "data": [
        12,
        23,
        38,
        45
      ]
    }
  ],
  "xAxisLabel": "",
  "yAxisLabel": ""
}
--- after visual edit ---
{
  "display": true,
  "text": "Updated title from the visual editor"
}
```

## 7. Test matrix — 65 unit tests + 7 hand-to-hand browser tests

Unit tests cover parsing, serialization, hashing, drift, the pure command layer, the node-view DOM behaviour, and the visual-model projection. Playwright e2e specs exercise the playground in a real Chromium — clicking sample buttons, editing source, and verifying canvases render.

```bash
NO_COLOR=1 FORCE_COLOR=0 npx vitest run --reporter=basic 2>&1 | grep -E "passed|Tests"
```

```output
 Test Files  12 passed (12)
      Tests  88 passed (88)
```

## 8. Try the playground

- Run the playground: `pnpm playground` → http://localhost:5173
- Unit tests: `pnpm test` (65 tests)
- Hand-to-hand browser tests: `pnpm test:e2e` (7 Playwright tests — boots the playground and drives it)
- Re-verify this walkthrough: `pnpm showboat:verify`

The playground ships four samples (basic bar, multi-chart report, chart with print URL, intentionally-invalid JSON) so you can exercise every capability from the browser.
