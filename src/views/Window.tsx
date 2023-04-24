import { Component, For } from "solid-js";
import { elementDiameter, smallestEnclosingCircle } from "../math/Geometry";
import { PhysicsElement } from "../Physics";
import { onMount, createEffect, children } from "solid-js";
import { makeDraggable } from "../DragAndDrop";
import type * as DustExpression from "../types/DustExpression";
import { DustExpressionView } from "./DustExpressionView";

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

function setUpWindowContents(windowContents: HTMLElement) {
  const elements: PhysicsElement[] = [];

  const windowContentsPhysicsElement = new PhysicsElement({
    htmlElement: windowContents,
    state: "pinned",
    diameter: 100,
  });

  function encircleWindowContents(): "proceed" {
    const boundary = smallestEnclosingCircle(elements);
    windowContentsPhysicsElement.setBoundary(boundary);
    return "proceed";
  }

  // TODO for tests use https://stackoverflow.com/questions/64558062/how-to-mock-resizeobserver-to-work-in-unit-tests-using-react-testing-library
  const resizeObserver = new ResizeObserver((entries) => {
    console.log("DustWindows resizeObserver:", entries);
    for (const entry of entries) {
      const windowElement = entry.target.parentElement;
      const borderBox = entry.borderBoxSize[0];
      // TODO need to recover the PhysicsElement.
      // May need to use customelements after all :(
      //  -> that would allow us to write entry.target.parentElement as PhysicsElement
      // for now we have to brute force (or use a hashmap):
      for (const physicsElement of elements) {
        if (physicsElement.htmlElement === windowElement) {
          physicsElement.diameter = Math.hypot(
            borderBox.blockSize,
            borderBox.inlineSize
          );
        }
      }
    }
  });

  for (const windowElement of windowContents.children) {
    // const windowElement = DustDOM.div({ className: "windowElement" }, [
    //   htmlElement,
    // ]);

    // windowContents.appendChild(windowElement);

    const physicsElement = new PhysicsElement({
      htmlElement: windowElement,
      state: "free",
      diameter: elementDiameter(htmlElement),
    });

    // TODO unobserve if the element is removed from the window
    resizeObserver.observe(htmlElement, { box: "border-box" });

    // TODO need some kind of callback so we can update the windowContents div
    makeDraggable(physicsElement);
    elements.push(physicsElement);
  }

  // TODO need to call this every frame
  encircleWindowContents();
}

const WindowContents: Component<{
  expressions: readonly DustExpression.Any[];
  id: string;
}> = (props) => {
  //  = <div class="windowContents"></div>;
  // DustDOM.div({ className: "windowContents" }, []);
  // const c = children(() => props.children);
  // createEffect(() => c().forEach((item) => (item.style.color = props.color)));
  // return <>{c()}</>;
  const depthLimit = 42; // TODO
  return (
    <div class="Dust windowContents" ref={setUpWindowContents}>
      <For each={props.expressions}>
        {(expression, index) => (
          <div class="windowElement">
            <DustExpressionView
              expression={expression}
              id={props.id + "/expressions/" + index()}
              depthLimit={depthLimit}
            />
          </div>
        )}
      </For>
    </div>
  );
};

export const Window: Component = (props) => {
  return <div></div>;
};
