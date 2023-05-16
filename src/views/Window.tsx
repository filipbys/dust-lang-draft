import {
  Component,
  createEffect,
  createSelector,
  createSignal,
  For,
  on,
  onMount,
  Signal,
} from "solid-js";
import { approximateSmallestEnclosingCircle } from "../math/Geometry";
import { PhysicsConstants } from "../math/Physics";
import {
  getAllPhysicsElements,
  IntoHTMLPhysicsSimulationComponent,
} from "./HTMLPhysicsSimulationComponent";
import { HTMLPhysicsSimulationElement } from "../html-custom-elements/HTMLPhysicsSimulationElement";
import { createSimulation, PhysicsSimulation } from "../math/PhysicsSimulation";

import "./Windows.css";
import { observeChildrenSizes } from "../observers/ChildSizeMutationObserver";
import { DustExpression } from "../text/DustExpression";
import { TextNode } from "../text/TextTree";
import { TextNodeEditor } from "../text-views/TextNodeEditor";
import { assertIsInstance } from "../type-utils/DynamicTypeChecks";
import { getJSONPointer } from "../text-views/Identifiers";
import { BINARY_OPERATORS } from "../text/DustExpressionParser";
import { MACROS } from "../text-views/Macros";

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

export function Window(props: {
  roots: TextNode[]; // TODO Dust.WindowExpression?
  id: string;
}) {
  // TODO ideally we wouldn't have a single signal for simulating physics for all elements. Instead it would be better for each physics-element-container (e.g. module) to have its own simulation. That way when a user e.g. drags an element, it would only trigger the physics in its container. If they drag an element all the way outside of its container, its style changes, and if they drag it past a certain threshold, the element is removed from its current container (which eventually pauses its simulation as everything goes still), and the closest overlapping sibling or ancestor physics-element-container lights up and starts *its* simulation, indicating that it's ready to adopt the dragged element. As the user keeps dragging the element, it keeps updating the currently-active physics-element-container, so that when they drop the element, it just slides into place until things come to rest and the simulation is paused.
  // NB: a change inside a physics-element-container can easily trigger changes within *its* parent physics-element-container, and so on all the way to the root. It's find to do this now and then because everything should go still fairly quickly and auto-pause, however, it should be avoided when possible. As such:
  //  - Always pin the focused element and all of its ancestors: their sizes can change but their positions must not.
  //  - When the user is actively editing, pause all simulations: everything is changing quickly and that introduces a lot of visual noise when the user is trying to focus.
  //  - As users pause, *slowly* resume the simulation -- literally in slow motion, gradually speeding it up over time until it settles. Reminder that all elements that contain focus are pinned.
  //  - Caveat: gently move non-focused elements out of the way as needed if the focused element grows with the given input. Movement just needs to be slow so the environment feels calm. In other words, the simulation only needs to run at full speed when dragging things around and actively interacting with them, and when just normally editing it should be either still or move in slow-motion.

  let simulationRef: PhysicsSimulation | null = null;
  const [simulationPlaying, setSimulationPlaying] = createSignal(false);
  const playSimulation = () => setSimulationPlaying(true);

  const [zoomPercent, setZoomPercent] = createSignal(100);
  function onZoomPercentInput(this: HTMLInputElement) {
    setZoomPercent(+this.value);
  }

  // TODO zoom with either 2 pointers or ctrl+scroll

  let windowContents: HTMLPhysicsSimulationElement;
  onMount(() => {
    // TODO add inputs for these as well for debugging
    const physicsConstants: PhysicsConstants = {
      maxVelocity: 5,
      dragMultiplier: 0.996,
      frictionCoefficient: 0.03,
    };

    console.warn("creating simulation");
    // TODO looks like there are multiple instances of this getting created.
    const simulation = createSimulation({
      physicsConstants,
      elements: getAllPhysicsElements(windowContents.parentElement!),
      onAutoPause() {
        console.log("autopause :)");
        setSimulationPlaying(false);
      },
    });
    simulationRef = simulation;
    createEffect(
      on(simulationPlaying, (value) => (simulation.playing = value)),
    );

    // TODO should this be centered=false, state=pinned, and that way we can just use native scrolling? And if so, do we even need the top level window physics element?
    windowContents.centeredWithinParent = true;
    windowContents.state = "free";
    windowContents.offsetDiameter = 1000;
    windowContents.playPhysicsSimulation = playSimulation;
    windowContents.simulationFrameCallback = () => {
      setZoomPercent(windowContents.localScale * 100);
      updateWindowContents(windowContents);
    };

    // TODO
    // observeChildrenSizes(
    //   windowContents,
    //   HTMLPhysicsSimulationElement,
    //   updateWindowContents,
    // );
  });

  createEffect(
    on(
      zoomPercent,
      (zoomPercent) => (windowContents.localScale = zoomPercent / 100),
    ),
  );

  // TODO document.addEventListener("selectionchange")
  function beforeTextTreeViewInput(this: HTMLElement, event: InputEvent) {
    const selection = window.getSelection();
    console.log("beforeTextTreeViewInput", this, event, selection);
    // if (
    //   event.inputType === "insertParagraph" ||
    //   event.inputType === "insertLineBreak"
    // ) {
    event.preventDefault();
    console.log(selection?.focusNode);

    // }
    // TODO handle changes here
  }

  function onTextTreeSelect(this: HTMLElement, event: Event) {
    // TODO track the current selection
  }

  const [selectedId, setSelectedId] = createSignal("");
  const isSelected = createSelector(selectedId);

  function initTextNodeEditorDiv(div: HTMLDivElement) {
    new MutationObserver((entries) => {
      console.log("text tree changed:", entries);
    }).observe(div, {
      childList: true,
      characterData: true,
      characterDataOldValue: true,
      subtree: true,
    });

    div.addEventListener("beforeinput", beforeTextTreeViewInput);
    // div.addEventListener("selectstart", (event) => {
    //   console.log("selectstart", event);
    // });

    div.addEventListener("focusin", (event) => {
      console.log("focusin", event);
    });

    div.addEventListener("focusout", (event) => {
      console.log("focusout", event);
    });

    // TODO override TAB behavior: move the cursor to the start of the newly focused element

    document.addEventListener("selectionchange", (event) => {
      const selection = document.getSelection();
      // console.log("selectionchange", event, selection, selectedId());
      if (!selection || !selection.focusNode) {
        setSelectedId("");
      } else if (selection.focusNode instanceof Element) {
        // TODO if the selected ID is a blank node, select the closest non-blank node.
        setSelectedId(getJSONPointer(selection.focusNode.id) ?? "");
      } else {
        const parent = selection.focusNode.parentElement;
        if (parent) {
          setSelectedId(getJSONPointer(parent.id) ?? "");
        } else {
          setSelectedId("");
        }
      }
      // console.log("selectionchange end", selectedId());
    });
  }

  function onTextNodeEditorNodeMouseDown(event: MouseEvent) {
    console.log("onTextNodeEditorNodeMouseDown", event);
    assertIsInstance(event.target, HTMLElement);
    setSelectedId(event.target.id); // TODO this gets overridden by the selectionchange event: need to signal to it that this takes precedence.
  }

  const zoomFactor = 1.1;
  return (
    <div
      id={props.id}
      classList={{
        Dust: true,
        window: true,
        simulationPlaying: simulationPlaying(),
      }}
    >
      <div class="Dust windowToolbar">
        <button onClick={() => setSimulationPlaying(!simulationPlaying())}>
          {simulationPlaying() ? "pause" : "play"} simulation
        </button>
        <button onClick={() => simulationRef!.runOneStep()}>
          Run one simulation step
        </button>
        <div style="display: inline-grid; grid-template-columns: auto auto auto">
          <span style="grid-column-start: 1; grid-column-end: 4;">
            Zoom {zoomPercent().toFixed(0)}%
          </span>
          <button onClick={() => setZoomPercent(zoomPercent() / zoomFactor)}>
            -
          </button>
          <input
            type="range"
            name="zoomPercent"
            min="0.1"
            max="1000"
            value={zoomPercent()}
            onInput={onZoomPercentInput}
          />
          <button onClick={() => setZoomPercent(zoomPercent() * zoomFactor)}>
            +
          </button>
        </div>
      </div>
      {/* TODO add a minimap area that always shows the whole project in a mini view, highlighting the part of it that's in view. Users can click/drag on the minimap to scroll to that part of the project. */}
      <div
        class="Dust scrollable windowContentArea"
        style="width: 1000px; height: 1000px;"
        contentEditable={true}
        ref={initTextNodeEditorDiv}
        onMouseDown={onTextNodeEditorNodeMouseDown}
      >
        <dust-physics-simulation-element
          class="Dust windowContents"
          ref={windowContents!}
        >
          <div class="Dust circle centeredWithinParent">
            <For each={props.roots}>
              {(root, index) => (
                <IntoHTMLPhysicsSimulationComponent
                  playPhysicsSimulation={playSimulation}
                  extraClasses={{
                    windowElement: true,
                  }}
                >
                  <TextNodeEditor
                    editorID={props.id + ":TextNodeEditor" + index()}
                    jsonPointer="/"
                    node={root}
                    binaryOperators={new Set(BINARY_OPERATORS)}
                    depthLimit={32}
                    displayType="parsedText"
                    macros={new Map(MACROS)}
                    isSelected={isSelected}
                    setSimulationPlaying={setSimulationPlaying}
                  />
                </IntoHTMLPhysicsSimulationComponent>
              )}
            </For>
          </div>
        </dust-physics-simulation-element>
      </div>
    </div>
  );
}

function updateWindowContents(element: HTMLPhysicsSimulationElement) {
  // TODO prevent collisions, encircleWindowContents(), etc
  const elements = element.getDirectPhysicsElementChildren();

  // TODO this might make panning while dragging janky; we'll have to see.
  // It might be better/necessary to use physics-based forces to grow/shrink the boundary just like with modules.
  // TODO center the wrapper on a specific element (e.g. the project's name?). Dragging the wrapper drags everything (i.e. scrolling), but dragging the project's name just moves the name and the wrapper's boundary.
  const boundary = approximateSmallestEnclosingCircle(elements); // uses .diameter of the elements
  // console.info("Window contents boundary:", boundary);
  // element.offsetDiameter = boundary.diameter * 2;
  // element.center = boundary.center;
}
