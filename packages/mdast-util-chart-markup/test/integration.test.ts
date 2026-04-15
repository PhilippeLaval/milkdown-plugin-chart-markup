import { describe, expect, it } from 'vitest';
import {
  canonicalizeChartMarkupBody,
  computePrintHash,
  extractChartBlocks,
  isPrintDrifted,
  parseChartMarkup,
  serializeChartMarkup,
  CHART_MARKUP_NODE_TYPE,
  type ChartMarkupNode,
  type ChartMarkupValue,
} from 'mdast-util-chart-markup';

const sampleDoc = `# Report

\`\`\`chart
{
  "type": "bar",
  "data": { "labels": ["A","B"], "datasets": [{ "label": "x", "data": [1,2] }] }
}
\`\`\`

Prose between charts.

\`\`\`chart
{
  "type": "line",
  "data": { "datasets": [{ "data": [1,2,3] }] },
  "print": "https://cdn.example.com/line.png",
  "printHash": "sha256:bogus"
}
\`\`\`
`;

describe('mdast-util-chart-markup — integration over a full document', () => {
  it('parses, hashes, and detects drift across every chart block', () => {
    const blocks = extractChartBlocks(sampleDoc);
    expect(blocks).toHaveLength(2);

    for (const b of blocks) {
      expect(b.parsed.type).toBe(CHART_MARKUP_NODE_TYPE);
    }

    const secondParsed = blocks[1]!.parsed as ChartMarkupNode;
    const reconstructed: ChartMarkupValue = {
      ...secondParsed.config,
      print: secondParsed.print,
      printHash: secondParsed.printHash,
    };
    expect(isPrintDrifted(reconstructed)).toBe(true);

    // After we "regenerate" the print, drift goes away.
    reconstructed.printHash = computePrintHash(secondParsed.config);
    expect(isPrintDrifted(reconstructed)).toBe(false);
  });

  it('parse → serialize is stable for every block in the sample document', () => {
    const blocks = extractChartBlocks(sampleDoc);
    for (const b of blocks) {
      const node = b.parsed as ChartMarkupNode;
      const out = serializeChartMarkup(node);
      const bodyOnly = out.replace(/^```chart\n|\n```$/g, '');
      const reparsed = parseChartMarkup(bodyOnly);
      if (reparsed.type !== CHART_MARKUP_NODE_TYPE) throw new Error('reparse failed');
      expect(serializeChartMarkup(reparsed)).toBe(out);
    }
  });

  it('canonicalizeChartMarkupBody is a safe pre-commit hook', () => {
    const messy = JSON.stringify({
      data: { datasets: [{ data: [1] }] },
      type: 'bar',
      options: { plugins: { title: { text: 'X', display: true } } },
    });
    const once = canonicalizeChartMarkupBody(messy);
    expect(canonicalizeChartMarkupBody(once)).toBe(once);
  });
});
