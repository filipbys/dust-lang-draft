import {
  batch,
  Component,
  createEffect,
  createSelector,
  createSignal,
  on,
  onMount,
} from "solid-js";
import "./styles.css";

import { BINARY_OPERATORS, parseExpression } from "./text/DustExpressionParser";
import { createStore, produce, SetStoreFunction, Store } from "solid-js/store";

import * as jsonpatch from "fast-json-patch";
// import { TextTreeView } from "./views/TextTreeView";
import { Window } from "./views/Window";
import { assert, logAndThrow } from "./development/Errors";
import { DustExpression } from "./text/DustExpression";
import { TextNode, toTextTree } from "./text/TextTree";
import { TextNodeEditor } from "./text-views/TextNodeEditor";
import { MACROS } from "./text-views/Macros";
import { assertIsInstance } from "./type-utils/DynamicTypeChecks";
import { getJSONPointer } from "./text-views/Identifiers";

function applyJsonPatch<T>(
  setStore: SetStoreFunction<T>,
  patch: readonly jsonpatch.Operation[],
) {
  setStore(
    produce((currentValue) => jsonpatch.applyPatch(currentValue, patch)),
  );
}

function selectionRanges(selection: Selection): IterableIterator<Range> {
  let index = 0;
  return {
    next(): IteratorResult<Range> {
      const range = selection.getRangeAt(index);
      index++;
      return { value: range, done: index === selection.rangeCount };
    },
    [Symbol.iterator]() {
      return this;
    },
  };
}

function closestElement(node: Node): Element | null {
  if (node instanceof Element) {
    return node;
  }
  return node.parentElement;
}

function removeRootName(path: string): string {
  return path.slice(path.indexOf("/")); // TODO check for off-by-one
}

function getLastItem(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1); // TODO check for off-by-one
}

function handleInputEvent(
  root: TextNode,
  event: InputEvent,
  selection: Selection,
): jsonpatch.Operation[] {
  // TODO batch()
  const operations: jsonpatch.Operation[] = [];
  if (event.inputType === "insertText") {
    const addedText = event.data;
    if (!addedText) {
      return operations;
    }
    for (const range of selectionRanges(selection)) {
      const startElement = closestElement(range.startContainer)!;
      const endElement = closestElement(range.endContainer)!;
      if (startElement === endElement) {
        const currentText = startElement.textContent ?? "";
        const newText =
          currentText.slice(0, range.startOffset) +
          addedText +
          currentText.slice(range.endOffset);

        operations.push({
          path: removeRootName(startElement.id),
          op: "replace",
          value: { textTreeKind: "leaf", text: newText },
        } satisfies jsonpatch.ReplaceOperation<TextNode>);
      } else {
        const commonAncestor = closestElement(range.commonAncestorContainer)!;
        const path = removeRootName(commonAncestor.id);
        assert(
          getLastItem(path) === "nodes",
          commonAncestor.id,
          path,
          getLastItem(path),
        );
        const nodes: TextNode[] = jsonpatch.getValueByPointer(root, path);

        const startIndex = parseInt(getLastItem(startElement.id));
        const endIndex = parseInt(getLastItem(endElement.id));

        operations.push({
          path,
          op: "replace",
          // TODO!!! update the start and end nodes too! Part of them might have gotten deleted
          value: [
            ...nodes.slice(0, startIndex + 1),
            { textTreeKind: "leaf", text: addedText },
            ...nodes.slice(endIndex),
          ],
        } satisfies jsonpatch.ReplaceOperation<TextNode[]>);
      }
    }
  }
  // TODO
  return operations;
}

function PlainTextEditor() {
  // TODO instead of synchronizing two stores, create a new tree type that stores the text nodes and their corresponding expressions?
  // Or how about this: have a Map<text-node-id, DustExpression> to cache the parsed expression for each text node. When a DOM text node changes, walk the tree up and re-parse each node, updating its entry in the map. Finally, take a diff between the new root and the previous one (should be fast since most of the tree will be shared), and apply that diff to the DustExpression store using setExpression. Alternatively try just setExpression(newRootExpression), but I suspect that will regenerate the entire DOM tree.
  // We could even represent this with customElements that contain both text data and parsed DustExpression data, and users can switch from showing one or the other, or even both in a little local split-screen, all just by toggling some css classes.
  // ACTUALLY why not just make parseTextTree() generic so it can return a DustExpression OR a DustExpressionView! The view is reactive on the *text tree* rather than the expression. If the expression is changed (e.g. by an editor refactor command), it will update the text tree, which in turn will update the DOM. If the user types input, that changes the text tree, which changes both the DOM and the dust expression tree. although... if we still need to update the expression tree for other tools, why not keep basing the DOM tree off of that like we are now...
  // ==> But maybe we can make parse() generic over Array.map vs solidjs.mapArray?
  const [textTree, setTextTree] = createStore<TextNode>({
    textTreeKind: "group",
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

  function beforeExpressionViewInput(event: InputEvent) {
    console.log("beforeExpressionViewInput", event, window.getSelection());
    event.preventDefault();
    // TODO handle changes here
  }

  const initialText = inputText(); // let contentEditable take over
  return (
    <div>
      {/* TODO input for font size */}
      <code class="debug-input-box" contentEditable={true} onInput={onInput}>
        {initialText}
      </code>
      <br />
      <button onClick={() => alert("TODO")}>Save</button>
      <br />
      <Window roots={[textTree]} id="ExampleWindow" />
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
}

function App() {
  try {
    return (
      <div class="Dust app">
        <PlainTextEditor />
      </div>
    );
  } catch (error) {
    console.error(error);
  }
}

export default App;
