import { Component, For, on } from "solid-js";
import {
  createEffect,
  createSignal,
  onMount,
} from "solid-js/types/reactive/signal";
import type * as DustExpression from "./DustExpression";
import { DustExpressionView } from "./DustExpressionView";
import { smallestEnclosingCircle } from "./Geometry";
import {
  createSimulation,
  pauseSimulation,
  playSimulation,
  Simulation,
} from "./Modules";
import { PhysicsElement } from "./Physics";

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

  const [simulationPlaying, setSimulationPlaying] = createSignal(true);

  let moduleHTMLElement: HTMLElement | null = null;

  let simulation: Simulation | null = null;
  onMount(() => {
    simulation = createSimulation(moduleHTMLElement!);
  });

  createEffect(
    on(simulationPlaying, (playing, wasPlaying) => {
      if (playing && !wasPlaying) {
        playSimulation(simulation!);
      }
      if (!playing && wasPlaying) {
        pauseSimulation(simulation!);
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
      {/* TODO add a way to add and remove elements */}

      <div class="Dust moduleElement moduleName">
        {props.moduleExpression.name}
      </div>
      <For each={props.moduleExpression.expressions}>
        {(expression, index) => (
          <div class="Dust moduleElement">
            <DustExpressionView
              expression={expression}
              id={props.id + "/expressions/" + index()}
              depthLimit={props.depthLimit - 1}
            />
          </div>
        )}
      </For>
    </div>
  );
};
