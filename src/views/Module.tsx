import { Component, For, on } from "solid-js";
import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import type * as DustExpression from "../types/DustExpression";
import { DustExpressionView } from "./DustExpressionView";
import {
  ForceCalculator,
  PhysicsSimulation,
  PhysicsSimulationElement,
} from "../simulations/PhysicsSimulation";
import { Simulation } from "./Modules";
// import { PhysicsSimulation } from "../simulations/PhysicsSimulation";

// TODO imported and exported values go around the outside.
// Private values are only visible when editing the module, so you
// can't see the private values of two different modules at the same time,
// at least not in the same window.
// When editing a module, it takes up as much space as it can on the window, so imports and exports are at the edges of the window. Other modules can be brought into view as well, but you can only see their surfaces, i.e. imports and exports
// When a module loses focus, the private values animate out, leaving just the imports and exports
// When you zoom out and even the imports/exports get too small to read, they are hidden as well and the module is just shown as a circle around the name, with arrows displaying the flow of dependencies in your project
// TODO should do a similar thing for function definitions: when zooming out, the body should animate out, leaving just the function signature

const ModuleElement: Component<{
  expression: DustExpression.Any;
  id: string;
  depthLimit: number;
  simulation: PhysicsSimulation;
}> = (props) => {
  return (
    <div
      class="Dust moduleElement"
      ref={(it) => mountModuleElement(it, props.simulation)}
    >
      <DustExpressionView {...props} />
    </div>
  );
};

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

  let moduleCircle: PhysicsSimulationElement | null = null;

  const calculateForces = () => {
    // TODO need a way to track the current PhysicsSimulationElements so we can calculate the forces
  };

  return (
    <div
      id={props.id}
      class="Dust module"
      ref={(it) => mountModule(it, props.simulation, calculateForces)}
    >
      <button onClick={() => (moduleCircle!.diameter += 20)}>grow</button>
      <button onClick={() => (moduleCircle!.diameter -= 20)}>shrink</button>
      {/* TODO add a way to add and remove elements */}

      <div
        class="Dust moduleElement moduleName"
        ref={(it) => mountModuleElement(it, props.simulation)}
      >
        {props.expression.name}
      </div>
      <For each={props.expression.expressions}>
        {(expression, index) => (
          <ModuleElement
            expression={expression}
            id={props.id + "/expressions/" + index()}
            depthLimit={props.depthLimit - 1}
            simulation={props.simulation}
          />
          // TODO the "simulation!" might or might not work
        )}
      </For>
    </div>
  );
};

function mountModuleElement(
  htmlElement: HTMLElement,
  simulation: PhysicsSimulation
): PhysicsSimulationElement {
  console.log("Mounting ModuleElement:", htmlElement);
  const simulationElement = new PhysicsSimulationElement({
    htmlElement,
    state: "free",
  });
  simulation.addElement(simulationElement);

  onCleanup(() => {
    console.log("Cleaning up ModuleElement:", htmlElement);
    simulation.removeElement(simulationElement);
  });
  return simulationElement;
}

function mountModule(
  htmlElement: HTMLElement,
  simulation: PhysicsSimulation,
  calculateForces: ForceCalculator
): PhysicsSimulationElement {
  console.log("Mounting Module:", htmlElement);
  const simulationElement = new PhysicsSimulationElement({
    htmlElement,
    state: "pinned",
  });

  simulation.addElement(simulationElement);
  simulation.addForceCalculator(calculateForces);
  onCleanup(() => {
    console.log("Cleaning up Module:", htmlElement);
    simulation.removeElement(simulationElement);
    simulation.removeForceCalculator(calculateForces);
  });
  return simulationElement;
}
