# Chart with pre-rendered print URL

This chart has a `print` URL suitable for export pipelines that cannot run
JavaScript. The `printHash` lets the export pipeline (and the editor) detect
drift if the JSON is edited after the PNG was generated.

```chart
{
  "type": "radar",
  "data": {
    "labels": ["Speed", "Quality", "Cost", "UX", "Security"],
    "datasets": [
      { "label": "Current", "data": [4, 5, 3, 4, 5] },
      { "label": "Target",  "data": [5, 5, 4, 5, 5] }
    ]
  },
  "print": "https://cdn.example.com/charts/radar-abc123.png",
  "printHash": "sha256:replace-me-at-render-time"
}
```
