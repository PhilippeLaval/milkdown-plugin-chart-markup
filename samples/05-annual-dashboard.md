# Annual performance dashboard — FY2025

A single markdown document that mixes narrative, tables, and five different
chart types. Every chart is authored inline as a fenced ` ```chart ` block and
renders live next to the prose that describes it.

## Executive summary

FY2025 was a breakout year for **Acme Analytics**. Annual recurring revenue
grew 3.75× from €12M to €45M, net revenue retention stayed above 120% all
year, and the product team shipped 47 features against a plan of 38.

The charts below walk through each KPI family: revenue, customer mix, product
velocity, quality posture, and headcount.

---

## 1 · Revenue growth

Quarterly ARR landed at €45M, up from €12M at the start of the year. Q3 was
the strongest absolute quarter thanks to the enterprise tier launch in July.

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

Monthly expansion revenue compounded every month of the year — no flat months,
no contractions.

```chart
{
  "type": "line",
  "data": {
    "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    "datasets": [
      { "label": "MRR (€k)", "data": [1000, 1120, 1260, 1420, 1600, 1810, 2100, 2380, 2650, 2920, 3200, 3750] }
    ]
  },
  "options": {
    "plugins": { "title": { "display": true, "text": "Monthly Recurring Revenue" } }
  }
}
```

---

## 2 · Customer mix

The Enterprise tier now represents 62% of ARR despite only 12% of customer
count — the classic whale-heavy distribution of a mid-market SaaS reaching
scale.

```chart
{
  "type": "doughnut",
  "data": {
    "labels": ["Enterprise", "Mid-market", "SMB"],
    "datasets": [
      { "label": "Share of ARR", "data": [62, 27, 11] }
    ]
  },
  "options": {
    "plugins": { "title": { "display": true, "text": "ARR by segment" } }
  }
}
```

---

## 3 · Product quality posture

Engineering tracked five quality axes quarterly. Security and UX improved
significantly; cost efficiency was intentionally de-prioritised in favour of
growth.

```chart
{
  "type": "radar",
  "data": {
    "labels": ["Speed", "Quality", "Cost", "UX", "Security"],
    "datasets": [
      { "label": "FY2024", "data": [3, 4, 4, 3, 3] },
      { "label": "FY2025", "data": [4, 5, 3, 5, 5] }
    ]
  },
  "options": {
    "plugins": { "title": { "display": true, "text": "Quality scorecard (1-5)" } }
  }
}
```

---

## 4 · Headcount growth

We went from 24 to 51 people in 12 months, with engineering still the single
largest function.

```chart
{
  "type": "bar",
  "data": {
    "labels": ["Eng", "Sales", "CS", "Ops", "Marketing"],
    "datasets": [
      { "label": "Start of year", "data": [12, 4, 3, 3, 2] },
      { "label": "End of year", "data": [24, 9, 7, 6, 5] }
    ]
  },
  "options": {
    "plugins": { "title": { "display": true, "text": "Headcount by function" } }
  }
}
```

---

## Key takeaways

- Revenue growth is real and compounding — no pull-forward, no discount-led deals.
- Customer concentration is now a **strategic** risk, not just a statistical one.
- The headcount plan for FY2026 should front-load CS and Ops to catch up with Sales.
- Security investment is paying off; we retire the "Security" radar axis next year and replace it with "Reliability".

> The single biggest bet of FY2026 is doubling down on Mid-market while keeping Enterprise win rates above 40%.
