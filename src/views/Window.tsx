import { Component, For } from "solid-js";
import { smallestEnclosingCircle } from "../math/Geometry";
import type * as DustExpression from "../types/DustExpression";
import { DustComponentProps, DustExpressionView } from "./DustExpressionView";
import { PhysicsConstants } from "../math/Physics";
import { PhysicsSimulationElement } from "../simulations/PhysicsSimulationElement";
import { IntoHTMLPhysicsSimulationComponent } from "./HTMLPhysicsSimulationComponent";
import { HTMLPhysicsSimulationElement } from "../simulations/HTMLPhysicsSimulationElement";
import { createSimulation } from "../simulations/PhysicsSimulationV2";

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

function setUpWindowContents(windowContents: HTMLPhysicsSimulationElement) {
  function updateForces(
    windowElement: PhysicsSimulationElement,
    physicsElements: PhysicsSimulationElement[]
  ) {
    // TODO update ForceCalculator terminology to reflect that we do more than just update forces. Maybe something like FrameCallback?
    const boundary = smallestEnclosingCircle(physicsElements);
    windowElement.setBoundary(boundary);
  }

  // TODO need to call this every frame
  // encircleWindowContents();
}

const WindowContents: Component<{
  baseProps: DustComponentProps;
  expressions: readonly DustExpression.Any[];
  playSimulation: () => void;
}> = (props) => {
  return (
    <dust-physics-simulation-element
      class="Dust windowContents"
      ref={(element) => {
        element.setDynamicProperties({
          playSimulation: props.playSimulation,
          simulationFrameCallback: () => {
            // TODO prevent collisions, encircleWindowContents(), etc
          },
        });
      }}
    >
      <For each={props.expressions}>
        {(expression, index) => (
          // TODO don't wrap in a bubble if the element is already a physicsElement (e.g. modules)
          <IntoHTMLPhysicsSimulationComponent
            playSimulation={props.playSimulation}
          >
            <DustExpressionView
              {...{
                ...props.baseProps,
                id: props.baseProps.id + "/expressions/" + index(),
                expression,
                playSimulation: props.playSimulation,
              }}
            />
          </IntoHTMLPhysicsSimulationComponent>
        )}
      </For>
    </dust-physics-simulation-element>
  );
};

export const Window: Component<{
  baseProps: DustComponentProps;
  expressions: DustExpression.Any[]; // TODO Dust.WindowExpression?
}> = (props) => {
  // TODO add inputs for these as well for debugging
  const physicsConstants: PhysicsConstants = {
    maxVelocity: 2,
    dragMultiplier: 0.995,
    frictionCoefficient: 0.01,
  };

  const [simulationPlaying, setSimulationPlaying] = createSimulation({
    constants: physicsConstants,
    elements: document.getElementsByTagName(
      HTMLPhysicsSimulationElement.TAG
    ) as HTMLCollectionOf<HTMLPhysicsSimulationElement>,
  });

  return (
    <div
      classList={{
        Dust: true,
        window: true,
        simulationPlaying: simulationPlaying(),
      }}
    >
      <button onClick={() => setSimulationPlaying(!simulationPlaying())}>
        {simulationPlaying() ? "pause" : "play"} simulation
      </button>
      <WindowContents
        {...{ ...props, playSimulation: () => setSimulationPlaying(true) }}
      />
    </div>
  );
};
