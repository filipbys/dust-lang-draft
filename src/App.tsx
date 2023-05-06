import {
  batch,
  Component,
  createEffect,
  createSignal,
  on,
  onMount,
} from "solid-js";
import "./styles.css";

import { TextNode, toTextTree } from "./text/TextTree";
import { parseExpression } from "./text/DustExpressionParser";
import { createStore, produce, SetStoreFunction, Store } from "solid-js/store";

import * as jsonpatch from "fast-json-patch";
import { TextTreeView } from "./views/TextTreeView";
import { Window } from "./views/Window";
import { logAndThrow } from "./development/Errors";
import { DustExpression } from "./text/DustExpression";

function applyJsonPatch<T>(
  setStore: SetStoreFunction<T>,
  patch: readonly jsonpatch.Operation[],
) {
  setStore(
    produce((currentValue) => jsonpatch.applyPatch(currentValue, patch)),
  );
}

const PlainTextEditor: Component = () => {
  // TODO instead of synchronizing two stores, create a new tree type that stores the text nodes and their corresponding expressions?
  // Or how about this: have a Map<text-node-id, DustExpression> to cache the parsed expression for each text node. When a DOM text node changes, walk the tree up and re-parse each node, updating its entry in the map. Finally, take a diff between the new root and the previous one (should be fast since most of the tree will be shared), and apply that diff to the DustExpression store using setExpression. Alternatively try just setExpression(newRootExpression), but I suspect that will regenerate the entire DOM tree.
  // We could even represent this with customElements that contain both text data and parsed DustExpression data, and users can switch from showing one or the other, or even both in a little local split-screen, all just by toggling some css classes.
  // ACTUALLY why not just make parseTextTree() generic so it can return a DustExpression OR a DustExpressionView! The view is reactive on the *text tree* rather than the expression. If the expression is changed (e.g. by an editor refactor command), it will update the text tree, which in turn will update the DOM. If the user types input, that changes the text tree, which changes both the DOM and the dust expression tree. although... if we still need to update the expression tree for other tools, why not keep basing the DOM tree off of that like we are now...
  // ==> But maybe we can make parse() generic over Array.map vs solidjs.mapArray?
  const [textTree, setTextTree] = createStore<TextNode>({
    kind: "group",
    groupType: "()",
    nodes: [],
    singleLine: true,
  });

  const [expression, setExpression] = createStore<DustExpression>({
    kind: "identifier",
    identifier: "loading...",
    singleLine: true,
  });

  //   const [inputText, setInputText] = createSignal(`
  //   module MyModule
  //   [
  //     (
  //       (example-math-expression [a b c] [x y z])
  //       = (
  //             (a + (b * c) + d)
  //           - (c + d)
  //           + (
  //               foo
  //               x
  //               [123 456 789]
  //               [4 (a + (f b)) [1 2 3] (f [1 2 3])]
  //             )
  //           / 42
  //           + (f x y z)
  //         )
  //     )

  //     ( module Public-Sub-Module [] [] )
  //   ]
  //   [
  //     ( (foo x list1 list2) = (list1 ++ [x] ++ list2) )

  //     ( module Private-Sub-Module [] [] )
  //   ]
  // `);

  // const [inputText, setInputText] = createSignal(`
  //     ( example-math-expression [a b c] [x y z] )
  //   = (
  //         (a + (b * c) + d)
  //       - (c + d)
  //       + (
  //           foo
  //           x
  //           [123 456 789]
  //           [4 (a + (f b)) [1 2 3] (f [1 2 3])]
  //         )
  //       / 42
  //       + (f x y z)
  //     )
  // `);

  const [inputText, setInputText] = createSignal(`
  module MyModule
  [
    (
        ( example-math-expression [a b c] [x y z] )
      = (
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
        )
    )
  ]
  [
    (
        (foo x list1 list2)
      = (list1 ++ [x] ++ list2)
    )
  ]
`);

  createEffect(
    on(inputText, (newInput) => {
      const parseResult = toTextTree(newInput);
      console.log("parseInput", parseResult);
      if (parseResult.kind !== "success") {
        logAndThrow("Failed to parse plain text:", parseResult);
      }
      const newTextTree = parseResult.node;

      const textTreeDiff = jsonpatch.compare(textTree, newTextTree);

      // TODO cache parse results from text tree nodes by reference, or only reparse the things that were added/removed
      const newExpression = parseExpression(newTextTree);

      const expressionDiff = jsonpatch.compare(expression, newExpression);
      console.log("input text changed:", textTreeDiff, expressionDiff);

      batch(() => {
        applyJsonPatch(setTextTree, textTreeDiff);
        applyJsonPatch(setExpression, expressionDiff);
      });
    }),
  );

  createEffect(
    on(
      () => textTree,
      (newTextTree) => {
        console.log("text tree changed", newTextTree);

        const textTreeDiff = jsonpatch.compare(textTree, newTextTree);

        const newExpression = parseExpression(newTextTree);

        const expressionDiff = jsonpatch.compare(expression, newExpression);
        console.log("input text changed:", textTreeDiff, expressionDiff);

        batch(() => {
          applyJsonPatch(setTextTree, textTreeDiff);
          applyJsonPatch(setExpression, expressionDiff);
        });
      },
    ),
  );

  function onInput(this: HTMLElement) {
    setInputText(this.textContent!);
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

  function beforeTextTreeViewInput(this: HTMLElement, event: InputEvent) {
    const selection = window.getSelection();
    console.log("beforeTextTreeViewInput", this, event, selection);
    if (
      event.inputType === "insertParagraph" ||
      event.inputType === "insertLineBreak"
    ) {
      event.preventDefault();
      console.log(selection?.focusNode);
    }
    // TODO handle changes here
  }

  function onTextTreeSelect(this: HTMLElement, event: Event) {
    // TODO track the current selection
  }

  function beforeExpressionViewInput(event: InputEvent) {
    console.log("beforeExpressionViewInput", event, window.getSelection());
    event.preventDefault();
    // TODO handle changes here
  }

  let textTreeViewDiv: HTMLDivElement;
  onMount(() => {
    new MutationObserver((entries) => {
      console.log("text tree changed:", entries);
    }).observe(textTreeViewDiv, {
      childList: true,
      characterData: true,
      characterDataOldValue: true,
      subtree: true,
    });
  });

  const initialText = inputText(); // let contentEditable take over
  return (
    <div>
      {/* TODO input for font size */}
      <code id="debug-input-box" contentEditable={true} onInput={onInput}>
        {initialText}
      </code>
      <br />
      <button onClick={() => alert("TODO")}>Save</button>
      <br />
      <div
        contentEditable={true}
        onBeforeInput={beforeTextTreeViewInput}
        style={{
          "padding": "10px",
          "display": "inline-block",
          "border": "3px solid black",
          "border-radius": "10px",
        }}
        ref={textTreeViewDiv!}
      >
        <TextTreeView id="root" node={textTree} />
      </div>
      <br />
      <div contentEditable={false} onBeforeInput={beforeExpressionViewInput}>
        {/* <DustExpressionView
          {...{
            id: "root",
            depthLimit: 42,
            onFocusIn: onElementFocusIn,
            onFocusOut: onElementFocusOut,
            expression,
            playSimulation: () => {},
          }}
        /> */}
        <Window
          expressions={[expression]}
          baseProps={{
            id: "plain-text-editor-output",
            depthLimit: 42, // TODO
            onFocusIn: onElementFocusIn,
            onFocusOut: onElementFocusOut,
          }}
        />
      </div>
      <br />
      {/* Readonly view to make sure updates are reflected */}
      {/* <div>
        <Window
          expressions={[expression]}
          baseProps={{
            id: "plain-text-editor-output-readonly",
            depthLimit: 42, // TODO
          }}
        />
      </div> */}
    </div>
  );
};

const App: Component = () => {
  try {
    return (
      <div class="Dust app">
        <PlainTextEditor />
      </div>
    );
  } catch (error) {
    console.error(error);
  }
};

export default App;
