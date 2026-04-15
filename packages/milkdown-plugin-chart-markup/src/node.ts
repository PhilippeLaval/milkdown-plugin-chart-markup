import { $node } from '@milkdown/utils';
import type { NodeSchema } from '@milkdown/transformer';
import {
  CHART_MARKUP_NODE_NAME,
  chartMarkupNodeSpec,
} from '@philippe-laval/plugin-chart-markup';
import {
  CHART_MARKUP_NODE_TYPE,
  canonicalStringify,
  canonicalizeValueWithPrintLast,
  parseChartMarkup,
  type ChartConfig,
  type ChartMarkupValue,
} from 'mdast-util-chart-markup';
import { chartMarkupLanguageTag } from 'micromark-extension-chart-markup';

interface MdastChartLike {
  type: string;
  value?: string;
  config?: ChartConfig;
  print?: string;
  printHash?: string;
  lang?: string;
}

export const chartMarkupNode = $node(CHART_MARKUP_NODE_NAME, () => {
  const schema: NodeSchema = {
    ...(chartMarkupNodeSpec as unknown as NodeSchema),
    parseMarkdown: {
      match: (node) => (node as MdastChartLike).type === CHART_MARKUP_NODE_TYPE,
      runner: (state, node, type) => {
        const mdast = node as MdastChartLike;
        if (mdast.config) {
          state.addNode(type, {
            config: canonicalStringify(mdast.config),
            print: mdast.print ?? null,
            printHash: mdast.printHash ?? null,
            lang: chartMarkupLanguageTag,
          });
          return;
        }
        // Defensive path — the remark transform should always fill `config`,
        // but fall back to parsing the raw value if something upstream hands
        // us a bare `chartMarkup`-typed node.
        const raw = mdast.value ?? '';
        const parsed = parseChartMarkup(raw);
        if (parsed.type === CHART_MARKUP_NODE_TYPE) {
          state.addNode(type, {
            config: canonicalStringify(parsed.config),
            print: parsed.print ?? null,
            printHash: parsed.printHash ?? null,
            lang: chartMarkupLanguageTag,
          });
        } else {
          state.addNode(type, {
            config: raw,
            print: null,
            printHash: null,
            lang: chartMarkupLanguageTag,
          });
        }
      },
    },
    toMarkdown: {
      match: (node) => node.type.name === CHART_MARKUP_NODE_NAME,
      runner: (state, node) => {
        const rawConfig = node.attrs.config as string;
        let config: ChartConfig;
        try {
          config = JSON.parse(rawConfig) as ChartConfig;
        } catch {
          // Body is malformed JSON — fall back to a plain `chart` fenced code
          // block so the document still round-trips losslessly. The node view
          // will surface the parse error visually.
          state.addNode('code', undefined, rawConfig, { lang: chartMarkupLanguageTag });
          return;
        }
        const value: ChartMarkupValue = { ...config };
        if (node.attrs.print) value.print = node.attrs.print as string;
        if (node.attrs.printHash) value.printHash = node.attrs.printHash as string;
        const body = canonicalizeValueWithPrintLast(value);
        const props: Record<string, unknown> = {
          lang: chartMarkupLanguageTag,
          config,
        };
        if (node.attrs.print) props.print = node.attrs.print as string;
        if (node.attrs.printHash) props.printHash = node.attrs.printHash as string;
        // Props type is JSONRecord, but the mdast builder just spreads it onto
        // the node — a structural cast through `unknown` lets us attach the
        // parsed config object for the downstream `chartMarkup` handler.
        state.addNode('chartMarkup', undefined, body, props as unknown as never);
      },
    },
  };
  return schema;
});
