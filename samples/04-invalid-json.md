# Error state demo

The block below is intentionally malformed. The playground should render a red
error badge around the block without crashing the surrounding document.

```chart
{ this is not valid json
```

The document continues rendering after the broken chart — readers see this
paragraph and the valid chart below.

```chart
{
  "type": "pie",
  "data": {
    "labels": ["Yes", "No"],
    "datasets": [{ "label": "Votes", "data": [42, 8] }]
  }
}
```
