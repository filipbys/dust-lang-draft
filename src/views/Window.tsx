import { Component, createSignal, For } from "solid-js";
import { elementDiameter, smallestEnclosingCircle } from "../math/Geometry";
import { createEffect, on } from "solid-js";
import type * as DustExpression from "../types/DustExpression";
import { DustExpressionView } from "./DustExpressionView";
import { PhysicsSimulation } from "../simulations/PhysicsSimulation";
import { PhysicsConstants } from "../math/Physics";
import { PhysicsSimulationElement } from "../simulations/PhysicsSimulationElement";
import { makeDraggable } from "../simulations/DragAndDrop";

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

function setUpWindowContents(windowContents: PhysicsSimulationElement) {
  function encircleWindowContents() {
    const boundary = smallestEnclosingCircle(elements);
    windowContents.setBoundary(boundary);
  }

  for (const windowElement of windowContents.children) {
    if (!(windowElement instanceof PhysicsSimulationElement)) {
      continue;
    }

    // TODO need some kind of callback so we can update the windowContents div
    makeDraggable(windowElement);
  }

  // TODO need to call this every frame
  encircleWindowContents();
}

const WindowContents: Component<{
  id: string;
  expressions: readonly DustExpression.Any[];
  simulation: PhysicsSimulation;
}> = (props) => {
  const depthLimit = 42; // TODO
  function updateForces(
    windowElement: PhysicsSimulationElement,
    physicsElements: PhysicsSimulationElement[]
  ) {
    // TODO
  }
  return (
    <dust-physics-simulation-element
      class="Dust windowContents"
      state="free"
      data={{ kind: "collection", updateForces, simulation: props.simulation }}
      diameter={100}
      ref={(it) => setUpWindowContents(it as PhysicsSimulationElement)}
    >
      <For each={props.expressions}>
        {(expression, index) => (
          <dust-physics-simulation-element
            class="windowElement"
            state="free"
            data={{ kind: "bubble", simulation: props.simulation }}
          >
            <DustExpressionView
              expression={expression}
              id={props.id + "/expressions/" + index()}
              depthLimit={depthLimit}
            />
          </dust-physics-simulation-element>
        )}
      </For>
    </dust-physics-simulation-element>
  );
};

export const Window: Component<{
  id: string;
  expressions: DustExpression.Any[]; // TODO Dust.WindowExpression?
}> = (props) => {
  // TODO add inputs for these as well for debugging
  const physicsConstants: PhysicsConstants = {
    maxVelocity: 2,
    dragMultiplier: 0.995,
    frictionCoefficient: 0.01,
  };
  const simulation = new PhysicsSimulation({
    constants: physicsConstants,
    playingSignal: createSignal(false),
  });

  return (
    <div
      classList={{
        Dust: true,
        window: true,
        simulationPlaying: simulation.playing,
      }}
    >
      <button onClick={() => (simulation.playing = !simulation.playing)}>
        {simulation.playing ? "pause" : "play"} simulation
      </button>
      <WindowContents
        id={props.id}
        expressions={props.expressions}
        simulation={simulation}
      />
    </div>
  );
};
