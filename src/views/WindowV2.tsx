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
import { PhysicsConstants, PhysicsElement, Springs } from "../math/Physics";
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
import { X, Y } from "../math/Vectors";
import { PhysicsContainer } from "../text-views/physics-containers/PhysicsContainer";

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

  let windowContents: HTMLDivElement;
  onMount(() => {
    // TODO add inputs for these as well for debugging
    const physicsConstants: PhysicsConstants = {
      maxVelocity: 3,
      dragMultiplier: 0.996,
      frictionCoefficient: 0.03,
    };

    console.warn("creating simulation");
    const elements = getAllPhysicsElements(windowContents.parentElement!);
    const simulation = createSimulation({
      physicsConstants,
      getActiveElements: () => elements,
      onAutoPause() {
        console.log("autopause :)");
        setSimulationPlaying(false);
      },
    });
    simulationRef = simulation;
    createEffect(
      on(simulationPlaying, (value) => (simulation.playing = value)),
    );

    // TODO upgrade it into an HTMLPhysicsSimulationElement
    // TODO should this be centered=false, state=pinned, and that way we can just use native scrolling? And if so, do we even need the top level window physics element?
    windowContents.centeredWithinParent = true;
    windowContents.state = "pinned";
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

  // TODO override "copy" handler: add the subtree to event.clipboardData as JSON

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

  function onTextNodeEditorPointerDown(event: MouseEvent) {
    console.log("onTextNodeEditorPointerDown", event, event.target);
    assertIsInstance(event.target, HTMLElement);
    if (event.target.matches(".Dust.textNode")) {
      event.stopPropagation();
    }
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
        <div style="display: inline-grid; width: 100%; grid-template-columns: auto 1fr auto; gap: 10px;">
          <span style="grid-column-start: 1; grid-column-end: 4;">
            Zoom {zoomPercent().toFixed(0)}%
          </span>
          <button
            style="padding-inline: 10px; padding-block: 5px;"
            onClick={() => setZoomPercent(zoomPercent() / zoomFactor)}
          >
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
          <button
            style="padding-inline: 10px; padding-block: 5px;"
            onClick={() => setZoomPercent(zoomPercent() * zoomFactor)}
          >
            +
          </button>
        </div>
        {/* TODO add simulation stats like total CPU time spent simulating and %CPU/timeUnit, etc */}
        <button onClick={() => setSimulationPlaying(!simulationPlaying())}>
          {simulationPlaying() ? "pause" : "play"} simulation
        </button>
        <button onClick={() => simulationRef!.runOneStep()}>
          Run one simulation step
        </button>
      </div>
      {/* TODO add a minimap area that always shows the whole project in a mini view, highlighting the part of it that's in view. Users can click/drag on the minimap to scroll to that part of the project. */}
      <div
        class="Dust scrollable windowContentArea"
        style="width: 1000px; height: 1000px;"
        contentEditable={true}
        ref={initTextNodeEditorDiv}
        onPointerDown={onTextNodeEditorPointerDown}
      >
        {/* TODO should be able to unwrap the parent DIV */}
        <PhysicsContainer id={props.id + ":windowContents"} shape="rectangle">
          <For each={props.roots}>
            {(root, index) => (
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
            )}
          </For>
          <div class="Dust windowPointerToolbar">
            {/* TODO! allow user to hide/show the toolbar, anchor it to one of the sides of the window, or have it follow the primary pointer around. It could even act like a PhysicsElement to make sure it doesn't hide the code? */}
            <button
              class="Dust windowPointerModifier"
              onMouseDown={() => {
                /* TODO indicator.pressed=true, detect long-press, etc. Do the same for the physics shift key. */
              }}
            >
              shift
            </button>
            <div class="Dust windowPointerModifierIndicator"></div>
            <button class="Dust windowPointerModifier">ctrl</button>
            <button class="Dust windowPointerModifier">alt/option</button>

            <label>
              Various inputs with/without modifier keys
              <ul>
                <li>
                  Clicking an item:
                  <table>
                    <thead>
                      <th>Modifier key(s)</th>
                      <th>Behavior</th>
                    </thead>
                    <tbody>
                      <tr>
                        <td>None</td>
                        <td>
                          if it wasn't selected, unselect the previous
                          selection(s) and add select it. Otherwise, just remove
                          the item from the selected set.
                        </td>
                      </tr>
                      <tr>
                        <td>Shift</td>
                        <td>
                          keep the previous selection(s) and add/remove the
                          item, along with all the items between it and the most
                          recently selected item, to/from the selected set.
                        </td>
                      </tr>
                      <tr>
                        <td>Ctrl</td>
                        <td>
                          keep the previous selection(s) and add/remove the item
                          to/from the selected set.
                        </td>
                      </tr>
                      <tr>
                        <td>Alt/Option</td>
                        <td>same as ctrl modifier (TBD).</td>
                      </tr>
                    </tbody>
                  </table>
                </li>
                <li>
                  Scrolling:
                  <table>
                    <thead>
                      <th>Modifier key(s)</th>
                      <th>Behavior</th>
                    </thead>
                    <tbody>
                      <tr>
                        <td>None</td>
                        <td>
                          {" "}
                          native scrolling behavior (usually scrolls the closest
                          scrollable element/document vertically, and many
                          browsers overload horizontal scrolling gestures as if
                          the user clicked back/next).
                        </td>
                      </tr>
                      <tr>
                        <td>Shift</td>
                        <td>
                          scroll, but lock to horizontal axis (this is the
                          native behavior in many browsers too)
                        </td>
                      </tr>
                      <tr>
                        <td>Ctrl</td>
                        <td>
                          zoom selected items (or the hovered item if none are
                          selected)
                        </td>
                      </tr>
                      <tr>
                        <td>Alt/Option</td>
                        <td>
                          rotate the selected items (or the hovered item if none
                          are selected) around the center of all the
                          selected/hovered elements
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </li>
                <li>Dragging: allow dragging anywhere</li>
                <li>
                  When resizing elements: aspect ratio is unlocked, so shapes
                  resize as little as possible to follow the pointer.
                </li>
                <li>
                  left/right/up/down:
                  <ul>
                    <li>
                      If cursors are present: move cursors one character
                      left/right, and to the closest element up/down.
                    </li>
                    <li>
                      Else if any items are selected: move selected items n
                      distance left/right/up/down, where n=1cm by default.
                    </li>
                  </ul>
                </li>
              </ul>
            </label>

            <label>
              Contextual:
              <ul>
                <li>
                  When dragging: TBD: add dragged-over items to the selection?
                </li>
                <li>
                  When resizing: lock aspect ratio: no matter which edge/corner
                  is dragged, the width-height ratio is kept the same.
                </li>
                <li>
                  left/right/up/down:
                  <ul>
                    <li>
                      If cursors are present: move cursors one character
                      left/right, and to the closest element up/down.
                    </li>
                    <li>
                      Else if any items are selected: move selected items n
                      distance left/right/up/down, where n=1mm by default.
                    </li>
                  </ul>
                </li>
              </ul>
            </label>

            <label>
              Contextual:
              <ul>
                <li>When dragging: TBD: snap center to grid?</li>
                <li>When resizing: TBD: snap width/height to grid?</li>
              </ul>
            </label>

            <label>
              Contextual:
              <ul>
                <li>When clicking an item: same as ctrl modifier (TBD).</li>
                <li>When scrolling:</li>
                <li>
                  When resizing: allow rotation with the same pointer that is
                  resizing the item(s)
                </li>
              </ul>
            </label>
          </div>
        </PhysicsContainer>
      </div>
    </div>
  );
}

function updateWindowContents(windowContents: HTMLPhysicsSimulationElement) {
  // TODO fix this hack
  const boundaryElement: PhysicsElement = {
    diameter: windowContents.offsetDiameter,
    center: [0, 0],
    velocity: [0, 0],
    force: [0, 0],
    mass: 100, // TODO sum of all the elements
  };

  // TODO prevent collisions, encircleWindowContents(), etc
  const elements = windowContents.getDirectPhysicsElementChildren();

  let numberOfProtrudingElements = 0;
  for (const element of elements) {
    // TODO keep them within the rectangle rather than the circle, otherwise you can explode the div's size by trying to drag elements towards the top left corner.
    const gap = Springs.keepWithin(
      element,
      boundaryElement,
      0.1 /* 1/(millis^2) */,
      0,
    );
    if (gap > -element.diameter) {
      // windowContents.offsetDiameter += 1;
      windowContents.offsetDiameter += gap + element.diameter;
      numberOfProtrudingElements++;
    }
  }
  const scrollable: HTMLElement = windowContents.closest(".scrollable")!;

  const radius = windowContents.diameter / 2;
  windowContents.center = [
    radius - scrollable.offsetWidth / 2,
    radius - scrollable.offsetHeight / 2,
  ];

  if (numberOfProtrudingElements > 0) {
    // windowContents.offsetDiameter += 1;
  }

  // console.info(numberOfProtrudingElements);

  // TODO this might make panning while dragging janky; we'll have to see.
  // It might be better/necessary to use physics-based forces to grow/shrink the boundary just like with modules.
  // TODO center the wrapper on a specific element (e.g. the project's name?). Dragging the wrapper drags everything (i.e. scrolling), but dragging the project's name just moves the name and the wrapper's boundary.
  const boundary = approximateSmallestEnclosingCircle(elements); // uses .diameter of the elements
  // console.info("Window contents boundary:", boundary);
  // element.offsetDiameter = boundary.diameter * 2;
  // element.center = boundary.center;
}
