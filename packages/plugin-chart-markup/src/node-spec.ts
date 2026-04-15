import { chartMarkupLanguageTag } from 'micromark-extension-chart-markup';

/**
 * ProseMirror node spec for the `chartMarkup` block. Kept as a plain object
 * literal (no `@milkdown/core` import) so that tests and tooling can inspect
 * the spec without booting an editor. The host application wires this into
 * its schema at plugin-registration time.
 */
export const chartMarkupNodeSpec = {
  group: 'block',
  atom: true,
  isolating: true,
  draggable: true,
  marks: '',
  attrs: {
    config: { default: '{}' },
    print: { default: null as string | null },
    printHash: { default: null as string | null },
    lang: { default: chartMarkupLanguageTag },
  },
  parseDOM: [
    {
      tag: 'div[data-chart-markup]',
      getAttrs: (dom: HTMLElement) => ({
        config: dom.getAttribute('data-config') ?? '{}',
        print: dom.getAttribute('data-print'),
        printHash: dom.getAttribute('data-print-hash'),
        lang: chartMarkupLanguageTag,
      }),
    },
  ],
  toDOM: (node: {
    attrs: { config: string; print: string | null; printHash: string | null };
  }) => [
    'div',
    {
      'data-chart-markup': 'true',
      'data-config': node.attrs.config,
      ...(node.attrs.print ? { 'data-print': node.attrs.print } : {}),
      ...(node.attrs.printHash ? { 'data-print-hash': node.attrs.printHash } : {}),
    },
  ] as const,
};

export const CHART_MARKUP_NODE_NAME = 'chartMarkup';
