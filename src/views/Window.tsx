import {
  Component,
  createEffect,
  createSignal,
  For,
  on,
  onMount,
  Signal,
} from "solid-js";
import { approximateSmallestEnclosingCircle } from "../math/Geometry";
import { DustComponentProps, DustExpressionView } from "./DustExpressionView";
import { PhysicsConstants } from "../math/Physics";
import {
  getAllPhysicsElements,
  getDirectPhysicsElementChildren,
  IntoHTMLPhysicsSimulationComponent,
} from "./HTMLPhysicsSimulationComponent";
import { HTMLPhysicsSimulationElement } from "../html-custom-elements/HTMLPhysicsSimulationElement";
import { createSimulation, PhysicsSimulation } from "../math/PhysicsSimulation";

import "./Windows.css";
import { observeChildrenSizes } from "../observers/ChildSizeMutationObserver";
import { DustExpression } from "../text/DustExpression";

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

export const Window: Component<{
  baseProps: DustComponentProps;
  expressions: DustExpression[]; // TODO Dust.WindowExpression?
}> = (props) => {
  // TODO ideally we wouldn't have a single signal for simulating physics for all elements. Instead it would be better for each physics-element-container (e.g. module) to have its own simulation. That way when a user e.g. drags an element, it would only trigger the physics in its container. If they drag an element all the way outside of its container, its style changes, and if they drag it past a certain threshold, the element is removed from its current container (which eventually pauses its simulation as everything goes still), and the closest overlapping sibling or ancestor physics-element-container lights up and starts *its* simulation, indicating that it's ready to adopt the dragged element. As the user keeps dragging the element, it keeps updating the currently-active physics-element-container, so that when they drop the element, it just slides into place until things come to rest and the simulation is paused.
  // NB: a change inside a physics-element-container can easily trigger changes within *its* parent physics-element-container, and so on all the way to the root. It's find to do this now and then because everything should go still fairly quickly and auto-pause, however, it should be avoided when possible. As such:
  //  - Always pin the focused element and all of its ancestors: their sizes can change but their positions must not.
  //  - When the user is actively editing, pause all simulations: everything is changing quickly and that introduces a lot of visual noise when the user is trying to focus.
  //  - As users pause, *slowly* resume the simulation -- literally in slow motion, gradually speeding it up over time until it settles. Reminder that all elements that contain focus are pinned.
  //  - Caveat: gently move non-focused elements out of the way as needed if the focused element grows with the given input. Movement just needs to be slow so the environment feels calm. In other words, the simulation only needs to run at full speed when dragging things around and actively interacting with them, and when just normally editing it should be either still or move in slow-motion.

  let simulationRef: PhysicsSimulation | null = null;
  const [simulationPlaying, setSimulationPlaying] = createSignal(false);
  const playSimulation = () => {}; // TODO setSimulationPlaying(true)

  const [zoomPercent, setZoomPercent] = createSignal(100);
  function onZoomPercentInput(this: HTMLInputElement) {
    setZoomPercent(+this.value);
  }

  // TODO zoom with either 2 pointers or ctrl+scroll

  let windowContents: HTMLPhysicsSimulationElement;
  onMount(() => {
    // TODO add inputs for these as well for debugging
    const physicsConstants: PhysicsConstants = {
      maxVelocity: 2,
      dragMultiplier: 0.995,
      frictionCoefficient: 0.01,
    };

    const simulation = createSimulation({
      physicsConstants,
      elements: getAllPhysicsElements(windowContents.parentElement!),
      onAutoPause() {
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
    windowContents.callbacks = {
      playSimulation,
      onSimulationFrame: updateWindowContents,
    };
    updateWindowContents(windowContents);

    observeChildrenSizes(
      windowContents,
      HTMLPhysicsSimulationElement,
      updateWindowContents,
    );
  });

  createEffect(
    on(
      zoomPercent,
      (zoomPercent) => (windowContents.scale = zoomPercent / 100),
    ),
  );

  const zoomFactor = 1.1;
  return (
    <div
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
      <div
        class="Dust scrollable windowContentArea"
        style="width: 1000px; height: 1000px;"
      >
        <dust-physics-simulation-element
          class="Dust windowContents"
          ref={windowContents!}
        >
          <For each={props.expressions}>
            {(expression, index) => (
              <IntoHTMLPhysicsSimulationComponent
                {...{
                  playSimulation,
                  extraClasses: {
                    windowElement: true,
                  },
                }}
              >
                <DustExpressionView
                  {...{
                    ...props.baseProps, // TODO may want to use mergeProps instead
                    id: props.baseProps.id + "/expressions/" + index(),
                    expression,
                    playSimulation,
                  }}
                />
              </IntoHTMLPhysicsSimulationComponent>
            )}
          </For>
        </dust-physics-simulation-element>
      </div>
    </div>
  );
};

function updateWindowContents(
  windowContentsWrapper: HTMLPhysicsSimulationElement,
) {
  // TODO prevent collisions, encircleWindowContents(), etc
  const elements = getDirectPhysicsElementChildren(windowContentsWrapper);

  // TODO this might make panning while dragging janky; we'll have to see.
  // It might be better/necessary to use physics-based forces to grow/shrink the boundary just like with modules.
  // TODO center the wrapper on a specific element (e.g. the project's name?). Dragging the wrapper drags everything (i.e. scrolling), but dragging the project's name just moves the name and the wrapper's boundary.
  const boundary = approximateSmallestEnclosingCircle(elements); // uses .diameter of the elements
  // windowContentsWrapper.offsetDiameter = boundary.diameter;
}
