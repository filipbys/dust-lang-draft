import { Component, For } from "solid-js";
import { smallestEnclosingCircle } from "../math/Geometry";
import { PhysicsElement } from "../Physics";
import { onMount, createEffect, children } from "solid-js";
import { makeDraggable } from "../DragAndDrop";
import type * as DustExpression from "../types/DustExpression";
import { DustExpressionView } from "./DustExpressionView";

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
