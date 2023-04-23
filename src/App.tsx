import { Component, createEffect, createSignal, on, onCleanup } from "solid-js";
import * as DustExpression from "./types/DustExpression";
import "./styles.css";

import { DustExpressionView } from "./views/DustExpressionView";
import { toTextTree } from "./text/TextTree";
import { parseExpression } from "./text/DustExpressionParser";
import { createStore, produce } from "solid-js/store";

import * as jsonpatch from "fast-json-patch";

const PlainTextEditor: Component = () => {
  const [expression, setExpression] = createStore<DustExpression.Any>({
    kind: "identifier",
    identifier: "loading...",
    totalLength: 42,
  });
  // TODO text-tree should have its own HTML views as well so we don't have to
  // always re-parse the entire text when something changes. The user should still see plain text, though we can always show group borders if desired.
  const [inputText, setInputText] = createSignal(`
  (a + (b * c) + d) 
- (c + d) 
+ ( 
    foo 
    x 
    [123 456 789] 
    [4 (a + (f b)) [1 2 3] (f [1 2 3])]
  )
/ 42 
+ (f x y z)
`);

  createEffect(
    on(inputText, (newInput) => {
      const newExpression = parseInput(newInput);
      const diff = jsonpatch.compare(expression, newExpression);
      console.log("input text changed:", diff);
      setExpression(
        produce((currentExpression) =>
          jsonpatch.applyPatch(currentExpression, diff)
        )
      );
    })
  );

  function onInput(this: HTMLElement) {
    setInputText(this.textContent!);
  }

  function onHTMLEditorInput(this: HTMLElement, event: InputEvent) {
    console.log("onHTMLEditorInput", this, event);
  }

  function onElementInput(this: HTMLElement, event: InputEvent) {
    console.log("onElementInput", this, event);
  }

  function onElementFocusIn(this: HTMLElement, event: FocusEvent) {
    console.log("onFocusIn", this, event);

    const range: Range = document.createRange();
    range.setStart(this, 0);
    range.collapse(true);

    const selection: Selection = window.getSelection()!;
    // selection.removeAllRanges();
    selection.addRange(range);
    // selection.
  }

  function onElementFocusOut(this: HTMLElement, event: FocusEvent) {
    console.log("onFocusOut", this, event, window.getSelection());
    // window.getSelection()!.removeAllRanges();
  }

  const initialText = inputText(); // let contentEditable take over
  return (
    <div>
      <code id="debug-input-box" contentEditable={true} onInput={onInput}>
        {initialText}
      </code>
      <button onClick={() => alert("TODO")}>Save</button>
      <div>
        <DustExpressionView
          expression={expression}
          id="plain-text-editor-output"
          depthLimit={42}
          onFocusIn={onElementFocusIn}
          onFocusOut={onElementFocusOut}
          onInput={onElementInput}
        />
      </div>
      <br />
      {/* Readonly view to make sure updates are reflected */}
      <div>
        <DustExpressionView
          expression={expression}
          id="plain-text-editor-output"
          depthLimit={42}
        />
      </div>
      {/* TODO depthLimit */}
    </div>
  );
  // TODO with contentEditable, either:
  // (A) Only text spans are contentEditable and onInput works on them but can't select multiple spans
  // (B) Everything is contentEditable and we can select everything, but onInput doesn't work

  // There are other issues as well (see e.g. https://answerly.io/blog/my-pain-developing-a-wysiwyg-editor-with-contenteditable/)
  // So we should...
  // TODO implement our own Caret element that can be moved around the document, splitting Spans in half where needed. That way we can more easily implement multiple Carets as well as Selections
};

function parseInput(text: string): DustExpression.Any {
  const parseResult = toTextTree(text);
  console.log("parseInput", parseResult);
  if (parseResult.kind !== "success") {
    throw parseResult;
  }
  return parseExpression(parseResult.node);
}

const App: Component = () => {
  return (
    <div class="Dust app">
      <PlainTextEditor />
    </div>
  );
};

export default App;
