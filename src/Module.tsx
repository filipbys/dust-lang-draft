import { Component, For, on } from "solid-js";
import {
  createEffect,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js/types/reactive/signal";
import type * as DustExpression from "./DustExpression";
import { DustExpressionView } from "./DustExpressionView";
import { smallestEnclosingCircle } from "./Geometry";
import { Simulation } from "./Modules";
import { PhysicsElement } from "./Physics";

const ModuleElement: Component<{
  expression: DustExpression.Any;
  id: string;
  depthLimit: number;
  simulation: Simulation;
}> = (props) => {
  let htmlElement: HTMLElement | null = null;
  onMount(() => {
    props.simulation.addElement(htmlElement!);

    onCleanup(() => {
      props.simulation.removeElement(htmlElement!);
    });
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

  const [simulationPlaying, setSimulationPlaying] = createSignal(false);

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
