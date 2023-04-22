import { Component, createEffect, createSignal } from "solid-js";
import * as DustExpression from "./DustExpression";
import "./styles.css";

import logo from "./logo.svg";
import { DustExpressionView } from "./DustExpressionView";
import { toTextTree } from "./TextTree";
import { parseExpression } from "./DustExpressionParser";

const PlainTextEditor: Component = () => {
  const [expressionSignal, setExpressionSignal] =
    createSignal<DustExpression.Any>({
      kind: "identifier",
      identifier: "loading...",
      totalLength: 42,
    });
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

  createEffect(() => {
    console.log("input text changed:", inputText());
    setExpressionSignal(parseInput(inputText()));
  });

  // function setInputText(this: HTMLElement, event: Event) {}
  return (
    <div>
      <code id="debug-input-box" contenteditable={true} onInput={onInput}>
        {initialText}
      </code>
      <button onClick={() => alert("TODO")}>Save</button>
      {/* TODO wrap in a module component */}
      {/* TODO I guess we need to pass the signal down to the DustExpressionView and use the Switch/Match control flow. For now we can call render() on a div container as a workaround */}
      <DustExpressionView
        expression={expressionSignal()}
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
