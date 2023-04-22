import { Component, createEffect, createSignal, on } from "solid-js";
import * as DustExpression from "./DustExpression";
import "./styles.css";

import { DustExpressionView } from "./DustExpressionView";
import { toTextTree } from "./TextTree";
import { parseExpression } from "./DustExpressionParser";
import { createStore } from "solid-js/store";

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
  const initialText = inputText();

  function onInput(this: HTMLElement) {
    console.log("onInput:", this.textContent);
    setInputText(this.textContent!);
  }

  createEffect(
    on(inputText, (newInput: string) => {
      const newExpression = parseInput(newInput);
      console.log("input text changed:", newInput, newExpression);
      // TODO use JSON patch to diff instead
      setExpression(newExpression);
    })
  );

  createEffect(() => {
    console.log("expression changed:", expression.kind, expression);
  });

  const testPath = ["expressions", 2, "expressions", 0, "identifier"] as const;

  function setExpressionUntyped(path: readonly [...any], value: any) {
    // TODO now this silently fails: check if path exists and throw error otherwise
    (setExpression as any)(...[...path, value]);
    console.log("new expression:", expression);
  }

  return (
    <div>
      <code id="debug-input-box" contenteditable={true} onInput={onInput}>
        {initialText}
      </code>
      <button onClick={() => alert("TODO")}>Save</button>
      <button onClick={() => setExpressionUntyped(testPath, "Hello!")}>
        update {testPath.toString()}
      </button>
      {/* TODO wrap in a module component */}
      {/* TODO I guess we need to pass the signal down to the DustExpressionView and use the Switch/Match control flow. For now we can call render() on a div container as a workaround */}
      <DustExpressionView
        expression={expression}
        id="plain-text-editor-output"
        depthLimit={42}
      />
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
