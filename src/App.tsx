import { Component, createEffect, createSignal, on } from "solid-js";
import * as DustExpression from "./DustExpression";
import "./styles.css";

import { DustExpressionView } from "./DustExpressionView";
import { toTextTree } from "./TextTree";
import { parseExpression } from "./DustExpressionParser";
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
    on(inputText, (newInput: string) => {
      const newExpression = parseInput(newInput);
      const diff = jsonpatch.compare(expression, newExpression);
      console.log("input text changed:", diff);
      setExpression(
        produce((currentExpression) => {
          jsonpatch.applyPatch(currentExpression, diff);
        })
      );
    })
  );

  function onInput(this: HTMLElement) {
    setInputText(this.textContent!);
  }

  const initialText = inputText(); // let contentEditable take over
  return (
    <div>
      <code id="debug-input-box" contentEditable={true} onInput={onInput}>
        {initialText}
      </code>
      <button onClick={() => alert("TODO")}>Save</button>
      <div contentEditable={true}>
        <DustExpressionView
          expression={expression}
          id="plain-text-editor-output"
          depthLimit={42}
        />
      </div>
      {/* TODO depthLimit */}
    </div>
  );
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
