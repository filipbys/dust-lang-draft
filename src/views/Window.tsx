import { Component, createSignal, For, on, Signal } from "solid-js";
import { approximateSmallestEnclosingCircle } from "../math/Geometry";
import type * as DustExpression from "../types/DustExpression";
import { DustComponentProps, DustExpressionView } from "./DustExpressionView";
import { PhysicsConstants } from "../math/Physics";
import {
  getAllPhysicsElements,
  getDirectPhysicsElementChildren,
  IntoHTMLPhysicsSimulationComponent,
} from "./HTMLPhysicsSimulationComponent";
import { HTMLPhysicsSimulationElement } from "../simulations/HTMLPhysicsSimulationElement";
import { createSimulation } from "../simulations/PhysicsSimulationV2";

import "./Windows.css";
import { createEffect } from "solid-js/types/reactive/signal";

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
  expressions: DustExpression.Any[]; // TODO Dust.WindowExpression?
}> = (props) => {
  const playingSignal = createSignal(false);

  const [simulationPlaying, setSimulationPlaying] = playingSignal;
  const playSimulation = () => {}; // TODO setPlaying(true);
  let runOneSimulationStep: ((deltaMillis: number) => void) | null = null;

  const [zoomLevel, setZoomLevel] = createSignal(100);
  function onZoomLevelInput(this: HTMLInputElement, event: InputEvent) {
    console.log("onZoomLevelInput", event);

    setZoomLevel(+this.value);
  }

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
        <button onClick={() => runOneSimulationStep!(16)}>
          Run one simulation step
        </button>
        <div style="display: grid; grid-template-columns: auto auto auto">
          <span style="grid-column-start: 1; grid-column-end: 4;">
            Zoom {zoomLevel}%
          </span>
          <button onClick={() => setZoomLevel(zoomLevel() / zoomFactor)}>
            -
          </button>
          <input
            type="range"
            name="zoomLevel"
            min="0.1"
            max="1000"
            value={zoomLevel()}
            onInput={onZoomLevelInput}
          />
          <button onClick={() => setZoomLevel(zoomLevel() * zoomFactor)}>
            +
          </button>
        </div>
      </div>
      <div class="Dust windowContentArea">
        <dust-physics-simulation-element
          class="Dust windowContents"
          style={{
            // TODO in css: transform: scale(zoomLevel) translate(x, y)
            transform: `scale(${zoomLevel()}%)`,
          }}
          ref={(element) => {
            console.log("windowContentArea physics element ref");
            // TODO add inputs for these as well for debugging
            const physicsConstants: PhysicsConstants = {
              maxVelocity: 2,
              dragMultiplier: 0.995,
              frictionCoefficient: 0.01,
            };

            runOneSimulationStep = createSimulation({
              physicsConstants,
              elements: getAllPhysicsElements(element.parentElement!),
              playingSignal,
            });

            // TODO should this be centered=false, state=pinned, and that way we can just use native scrolling? And if so, do we even need the top level window physics element?
            element.centeredWithinParent = true;
            element.state = "free";
            element.callbacks = {
              playSimulation,
              onSimulationFrame: updateWindowContents,
            };
          }}
        >
          <For each={props.expressions}>
            {(expression, index) => (
              // TODO don't wrap in a bubble if the element is already a physicsElement (e.g. modules)
              <IntoHTMLPhysicsSimulationComponent {...{ playSimulation }}>
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
  windowContentsWrapper: HTMLPhysicsSimulationElement
) {
  // TODO prevent collisions, encircleWindowContents(), etc
  const elements = getDirectPhysicsElementChildren(windowContentsWrapper);

  // TODO this might make panning while dragging janky; we'll have to see.
  // It might be better/necessary to use physics-based forces to grow/shrink the boundary just like with modules.
  // TODO center the wrapper on a specific element (e.g. the project's name?). Dragging the wrapper drags everything (i.e. scrolling), but dragging the project's name just moves the name and the wrapper's boundary.
  windowContentsWrapper.setBoundary(
    approximateSmallestEnclosingCircle(elements)
  );
}

function encircleWindowContents() {
  // 1. Find smallest enclosing rectangle
  // 2. radius = max(distanceToCenter())
}
