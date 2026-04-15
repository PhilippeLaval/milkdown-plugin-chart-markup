import { $useKeymap } from '@milkdown/utils';
import type { Command } from '@milkdown/prose/state';
import { createDefaultChartConfig } from '@philippe-laval/plugin-chart-markup';
import { canonicalStringify } from 'mdast-util-chart-markup';
import { chartMarkupLanguageTag } from 'micromark-extension-chart-markup';
import { chartMarkupNode } from './node.js';

/**
 * Keymap that replaces `Mod-Alt-c` with an "insert a default chart block at
 * the current selection" command. Backspace/Delete for atom-node deletion is
 * left to ProseMirror's base keymap, which already handles node selections.
 *
 * The primitives package exposes `chartMarkupKeymap` as a binding table
 * without actual ProseMirror command bodies — since those bodies are
 * necessarily editor-specific, the Milkdown adapter owns them here rather
 * than leaking editor runtime into the primitives layer.
 */
export const chartMarkupKeymap = $useKeymap('chartMarkupKeymap', {
  InsertDefaultChart: {
    shortcuts: 'Mod-Alt-c',
    command: (ctx) => {
      const type = chartMarkupNode.type(ctx);
      const run: Command = (state, dispatch) => {
        const config = createDefaultChartConfig();
        const attrs = {
          config: canonicalStringify(config),
          print: null,
          printHash: null,
          lang: chartMarkupLanguageTag,
        };
        const node = type.create(attrs);
        if (dispatch) {
          dispatch(state.tr.replaceSelectionWith(node).scrollIntoView());
        }
        return true;
      };
      return run;
    },
  },
});
