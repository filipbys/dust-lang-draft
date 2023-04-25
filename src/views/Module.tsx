import { Component, ComponentProps, For, on, Ref } from "solid-js";
import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import type * as DustExpression from "../types/DustExpression";
import { DustExpressionView } from "./DustExpressionView";
import { PhysicsSimulation } from "../simulations/PhysicsSimulation";
import {
  PhysicsSimulationElement,
  PhysicsSimulationElementProps,
} from "../simulations/PhysicsSimulationElement";
import {
  addElementIfAbsent,
  removeElementIfPresent,
} from "../data-structures/Arrays";
import { calculateForcesInModule } from "./Modules";
// import { PhysicsSimulation } from "../simulations/PhysicsSimulation";

// TODO imported and exported values go around the outside.
// Private values are only visible when editing the module, so you
// can't see the private values of two different modules at the same time,
// at least not in the same window.
// When editing a module, it takes up as much space as it can on the window, so imports and exports are at the edges of the window. Other modules can be brought into view as well, but you can only see their surfaces, i.e. imports and exports
// When a module loses focus, the private values animate out, leaving just the imports and exports
// When you zoom out and even the imports/exports get too small to read, they are hidden as well and the module is just shown as a circle around the name, with arrows displaying the flow of dependencies in your project
// TODO should do a similar thing for function definitions: when zooming out, the body should animate out, leaving just the function signature

declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements {
      [PhysicsSimulationElement.TAG]: ComponentProps<"div"> &
        PhysicsSimulationElementProps;
    }
  }
}

export const Module: Component<{
  expression: DustExpression.Module;
  id: string;
  depthLimit: number;
  simulation: PhysicsSimulation;
}> = (props) => {
  // TODO:
  // - Create a signal for whether the simulation is playing
  // - Toggle a class on the module element if simulation is playing
  // - Set up MutationObservers and ResizeObservers to auto-play the simulation
  // - Auto-pause the simulation if every PhysicsElement has zero velocity

  const simulation = props.simulation;

  let moduleElement: PhysicsSimulationElement | null = null;

  function calculateForces(childElements: PhysicsSimulationElement[]) {
    calculateForcesInModule(moduleElement!, childElements);
  }

  function mountModule(element: HTMLDivElement) {
    console.log("Mounting Module:", element);
    moduleElement = element as PhysicsSimulationElement;
  }

  return (
    <dust-physics-simulation-element
      id={props.id}
      class="Dust module"
      state="pinned"
      simulation={props.simulation}
      calculateForces={calculateForces}
      ref={mountModule}
    >
      <button onClick={() => (moduleElement!.diameter += 20)}>grow</button>
      <button onClick={() => (moduleElement!.diameter -= 20)}>shrink</button>
      {/* TODO add a way to add and remove elements */}

      <dust-physics-simulation-element
        class="Dust moduleElement moduleName"
        state="pinned"
        simulation={props.simulation}
      >
        {props.expression.name}
      </dust-physics-simulation-element>
      <For each={props.expression.expressions}>
        {(expression, index) => (
          <dust-physics-simulation-element
            class="Dust moduleElement"
            state="free"
            simulation={props.simulation}
          >
            <DustExpressionView
              id={props.id + "/expressions/" + index()}
              expression={expression}
              depthLimit={props.depthLimit - 1}
            />
          </dust-physics-simulation-element>
        )}
      </For>
    </dust-physics-simulation-element>
  );
};
