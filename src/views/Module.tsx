import { Component, For, on } from "solid-js";
import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import type * as DustExpression from "../types/DustExpression";
import { DustExpressionView } from "./DustExpressionView";
import { smallestEnclosingCircle } from "../math/Geometry";
import { PhysicsSimulation } from "../simulations/PhysicsSimulation";
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
  let htmlElement: HTMLElement | null = null;
  onMount(() => {
    const element = htmlElement!;
    props.simulation.addElement(element);

    onCleanup(() => props.simulation.removeElement(element));
  });

  return (
    <div class="Dust moduleElement" ref={(it) => (htmlElement = it)}>
      <DustExpressionView {...props} />
    </div>
  );
};

export const Module: Component<{
  moduleExpression: DustExpression.Module;
  id: string;
  depthLimit: number;
}> = (props) => {
  // TODO:
  // - Create a signal for whether the simulation is playing
  // - Toggle a class on the module element if simulation is playing
  // - Set up MutationObservers and ResizeObservers to auto-play the simulation
  // - Auto-pause the simulation if every PhysicsElement has zero velocity

  const [simulationPlaying, setSimulationPlaying] =
    createSignal<boolean>(false);

  let moduleHTMLElement: HTMLElement | null = null;
  let moduleNameHTMLElement: HTMLElement | null = null;
  let simulation: Simulation | null = null;

  onMount(() => {
    simulation = new Simulation(moduleHTMLElement!, moduleNameHTMLElement!);
    setSimulationPlaying(true);
  });

  createEffect(
    on(simulationPlaying, (playing, wasPlaying) => {
      if (playing && !wasPlaying) {
        simulation!.play();
      }
      if (!playing && wasPlaying) {
        simulation!.pause();
      }
    })
  );

  return (
    <div
      id={props.id}
      class="Dust module"
      ref={(it) => (moduleHTMLElement = it)}
    >
      <button onClick={() => (simulation!.moduleElement.diameter += 20)}>
        grow
      </button>
      <button onClick={() => (simulation!.moduleElement.diameter -= 20)}>
        shrink
      </button>
      <button onClick={() => setSimulationPlaying(!simulationPlaying())}>
        {simulationPlaying() ? "pause" : "play"} simulation
      </button>
      {/* TODO add a way to add and remove elements */}

      <div
        class="Dust moduleElement moduleName"
        ref={(it) => (moduleNameHTMLElement = it)}
      >
        {props.moduleExpression.name}
      </div>
      <For each={props.moduleExpression.expressions}>
        {(expression, index) => (
          <ModuleElement
            expression={expression}
            id={props.id + "/expressions/" + index()}
            depthLimit={props.depthLimit - 1}
            simulation={simulation!}
          />
          // TODO the "simulation!" might or might not work
        )}
      </For>
    </div>
  );
};
