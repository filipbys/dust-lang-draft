import type * as DustExpression from "./DustExpression";
import * as DustHTML from "./DustHTML";
import { toTextTree } from "./TextTree";
import { parseExpression } from "./DustExpressionParser";

// TODO use customElements?
export function createWindow(
  root: DustExpression.Any,
  depthLimit: number
): HTMLElement {
  const rootID = "root";
  // const callbacks: DustHTML.Callbacks = { onInput, onKeyDown, onFocusIn, onFocusOut, onGroupClicked }
  return DustHTML.expressionToHTML(root, rootID, depthLimit, {
    onInput: function (this: HTMLSpanElement) {
      // TODO parse, validate, update the expression DOM tree, update any e.g. input textareas
      console.log(`${this.id} onInput: ${this.textContent}`);

      const parseResult = toTextTree(this.textContent || "");
      if (parseResult.kind !== "success") {
        console.warn(`parse error: ${JSON.stringify(parseResult)}`);
        return;
      }
      const newSubExpression = parseExpression(parseResult.node);
      console.log("new subexpression: " + JSON.stringify(newSubExpression));

      // TODO update state: add/remove HTML nodes as needed
    },

    onKeyDown: function (this: HTMLSpanElement, event: Event) {
      console.log(`${this.id} keydown:`);
      console.log(event);
      // TODO handle commands
    },

    onFocusIn: function (this: HTMLElement, event: Event) {
      console.log(`${this.id} focusin`);
    },

    onFocusOut: function (this: HTMLSpanElement, event: Event) {
      console.log(`${this.id} focusout`);
      if (!this.textContent || this.textContent.length === 0) {
        console.log(`${this.id} is empty: removing`);
        // TODO store the operation for undo/redo
        this.remove();
      }
    },

    onGroupClicked: function (this: HTMLDivElement, event: Event) {
      console.log(`${this.id} clicked`);
      event.stopPropagation();
    },
  });
  // TODO window should have a toolbar with undo/redo, zoom in/out, insert, set depth limit, etc buttons

  // TODO commands
  // Cursor left/right/up/down one character: left/right/up/down arrow keys
  // Cursor left/right one word: Control + left/right arrow key
  // Move focus out to parent: Control + up
  // Move focus down to first child: Control + down
  // Delete previous/next character: Backspace/Delete
  // Delete previous/next word: Control+Backspace/Delete

  // Append identifier: any whitespace within a Non-Text-based group. In Text-based groups, whitespace is treated like any other character

  // Create new group: '('. If a range is selected, the new group is created around that selection. Multiple separate selctions are grouped separately.
  // Close/Exit current group: ')'. NB: this is different from Control+Up because rather than focusing on the parent, the cursor moves to a TextSpan that follows the current group, which might have been added just for this reason.
  // Delete current group: Alt+Backspace or Alt+Delete
  //

  // TODO commands without modifier keys:
  // (TODO although these are more like substitution keywords rather than commands: even if we parse a plain text DustExpression we should still substitute these )
  // \lambda|     ==>  λ|
  // \lte|        ==>  ≤|
  // <=|          ==>  ≤|
  // >=|          ==>  ≥|
  // \rightarrow| ==>  →|
  // ->|          ==>  →|
  // \leftarrow|  ==>  ←|
  // <-|          ==>  ←|
  // \identical|  ==>  ≡|
  // \comment|    ==>  «|»
  //
}
