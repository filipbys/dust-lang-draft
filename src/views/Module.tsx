import { Component, ComponentProps, For, on, ParentProps, Ref } from "solid-js";
import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import type * as DustExpression from "../types/DustExpression";
import { DustExpressionView, ExpressionProps } from "./DustExpressionView";
import { PhysicsSimulation } from "../simulations/PhysicsSimulation";
import {
  PhysicsSimulationElement,
  PhysicsSimulationElementData,
  PhysicsSimulationElementProps,
} from "../simulations/PhysicsSimulationElement";

import { updateForcesInModule } from "./Modules";
import { PhysicsSimulationElementComponent } from "./PhysicsSimulationElement-solidjs";

// TODO imported and exported values go around the outside.
// Private values are only visible when editing the module, so you
// can't see the private values of two different modules at the same time,
// at least not in the same window.
// When editing a module, it takes up as much space as it can on the window, so imports and exports are at the edges of the window. Other modules can be brought into view as well, but you can only see their surfaces, i.e. imports and exports
// When a module loses focus, the private values animate out, leaving just the imports and exports
// When you zoom out and even the imports/exports get too small to read, they are hidden as well and the module is just shown as a circle around the name, with arrows displaying the flow of dependencies in your project
// TODO should do a similar thing for function definitions: when zooming out, the body should animate out, leaving just the function signature

export type ModuleProps = ExpressionProps<DustExpression.Module>;

export const Module: Component<ModuleProps> = (props) => {
  let moduleElement: PhysicsSimulationElement | null = null;

  function mountModule(element: HTMLElement) {
    console.log("Mounting Module:", element);
    moduleElement = element as PhysicsSimulationElement;
  }

  return (
    <PhysicsSimulationElementComponent
      id={props.id}
      class="Dust module"
      physicsProps={{
        state: "pinned",
        data: {
          kind: "collection",
          updateForces: updateForcesInModule,
          simulation: props.simulation,
        },
      }}
      ref={mountModule}
    >
      <button onClick={() => (moduleElement!.diameter += 20)}>grow</button>
      <button onClick={() => (moduleElement!.diameter -= 20)}>shrink</button>
      {/* TODO add a way to add and remove elements */}

      <PhysicsSimulationElementComponent
        class="Dust moduleElement moduleName"
        physicsProps={{
          state: "pinned",
          data: {
            kind: "bubble",
            simulation: props.simulation,
          },
        }}
      >
        <DustExpressionView
          {...{
            ...props,
            id: props.id + "/name",
            expression: props.expression.name,
            depthLimit: props.depthLimit - 1,
          }}
        />
      </PhysicsSimulationElementComponent>
      <ModuleElementList
        baseProps={{
          ...props,
          id: props.id + "/publicElements/",
          depthLimit: props.depthLimit - 1,
        }}
        visibility="public"
        expressions={props.expression.publicElements}
      />
      <ModuleElementList
        baseProps={{
          ...props,
          id: props.id + "/privateElements/",
          depthLimit: props.depthLimit - 1,
        }}
        visibility="private"
        expressions={props.expression.privateElements}
      />
    </PhysicsSimulationElementComponent>
  );
};

const ModuleElementList: Component<{
  baseProps: ModuleProps;
  visibility: "public" | "private";
  expressions: readonly DustExpression.Any[];
}> = (props) => (
  <For each={props.expressions}>
    {(expression, index) => (
      // TODO don't wrap in a bubble if the element is already a physicsElement (e.g. modules)
      <PhysicsSimulationElementComponent
        classList={{
          Dust: true,
          moduleElement: true,
          [props.visibility]: true,
        }}
        physicsProps={{
          state: "free",
          data: { kind: "bubble", simulation: props.baseProps.simulation },
        }}
      >
        <DustExpressionView
          {...{
            ...props.baseProps,
            id: props.baseProps.id + index(),
            expression,
          }}
        />
      </PhysicsSimulationElementComponent>
    )}
  </For>
);
