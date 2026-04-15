import { $view } from '@milkdown/utils';
import type { NodeViewConstructor } from '@milkdown/prose/view';
import {
  mountChartNodeView,
  type ChartNodeViewHandle,
} from '@philippe-laval/plugin-chart-markup';
import { chartMarkupNode } from './node.js';
import type { ChartMarkupCtx } from './ctx.js';

/**
 * Wires `mountChartNodeView` from the primitives package into Milkdown's
 * NodeView lifecycle. All host-specific rendering concerns (Chart.js factory,
 * drift warning, error reporting) are read from the ctx slice at mount time.
 */
export function createChartMarkupView(optionsCtx: ChartMarkupCtx) {
  return $view(chartMarkupNode, (ctx): NodeViewConstructor => {
    const runtime = ctx.get(optionsCtx.key);
    return (node) => {
      const handle: ChartNodeViewHandle = mountChartNodeView(
        document,
        {
          rawJson: node.attrs.config as string,
          print: (node.attrs.print as string | null) ?? null,
          printHash: (node.attrs.printHash as string | null) ?? null,
        },
        {
          chartFactory: runtime.chartFactory,
          showDriftWarning: runtime.showDriftWarning,
        },
      );
      handle.dom.contentEditable = 'false';
      let current = node;
      return {
        dom: handle.dom,
        update(next) {
          if (next.type !== current.type) return false;
          if (
            next.attrs.config !== current.attrs.config ||
            next.attrs.print !== current.attrs.print ||
            next.attrs.printHash !== current.attrs.printHash
          ) {
            handle.update(
              next.attrs.config as string,
              (next.attrs.print as string | null) ?? null,
              (next.attrs.printHash as string | null) ?? null,
            );
          }
          current = next;
          return true;
        },
        // Chart.js owns its own pointer interactions (tooltips, legend
        // toggles). Don't let ProseMirror reinterpret them as selection
        // changes or spurious input events.
        stopEvent: () => true,
        ignoreMutation: () => true,
        destroy() {
          handle.destroy();
        },
      };
    };
  });
}
