# Quarterly investor update

Three charts in a single report. Each block is an independent chart node; the
playground renders them in order.

## Revenue growth

```chart
{
  "type": "line",
  "data": {
    "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    "datasets": [
      { "label": "MRR (€k)", "data": [110, 130, 160, 190, 220, 260] }
    ]
  },
  "options": {
    "plugins": { "title": { "display": true, "text": "Monthly Recurring Revenue" } }
  }
}
```

## Customer mix

```chart
{
  "type": "doughnut",
  "data": {
    "labels": ["Enterprise", "Mid-market", "SMB"],
    "datasets": [
      { "label": "Customers", "data": [12, 34, 58] }
    ]
  }
}
```

## Headcount by team

```chart
{
  "type": "bar",
  "data": {
    "labels": ["Eng", "Sales", "CS", "Ops"],
    "datasets": [
      { "label": "Headcount", "data": [24, 9, 6, 4] }
    ]
  }
}
```
