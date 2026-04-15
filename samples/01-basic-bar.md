# Basic bar chart

Quarterly revenue visualised with a bar chart. The JSON below is authoritative
— edit it and the canvas re-renders live.

```chart
{
  "type": "bar",
  "data": {
    "labels": ["Q1", "Q2", "Q3", "Q4"],
    "datasets": [
      { "label": "ARR (€M)", "data": [12, 23, 38, 45] }
    ]
  },
  "options": {
    "plugins": { "title": { "display": true, "text": "Annual Recurring Revenue" } }
  }
}
```
