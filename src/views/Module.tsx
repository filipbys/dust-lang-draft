import { Component, For, onMount } from "solid-js";
import { approximateSmallestEnclosingCircle } from "../math/Geometry";
import { Springs } from "../math/Physics";
import { HTMLPhysicsSimulationElement } from "../simulations/HTMLPhysicsSimulationElement";
import type * as DustExpression from "../types/DustExpression";
import { DustExpressionView, ExpressionProps } from "./DustExpressionView";
import {
  getDirectPhysicsElementChildren,
  IntoHTMLPhysicsSimulationComponent,
  updateWrapper,
} from "./HTMLPhysicsSimulationComponent";

// TODO imported and exported values go around the outside.
// Private values are only visible when editing the module, so you
// can't see the private values of two different modules at the same time,
// at least not in the same window.
// When editing a module, it takes up as much space as it can on the window, so imports and exports are at the edges of the window. Other modules can be brought into view as well, but you can only see their surfaces, i.e. imports and exports
// When a module loses focus, the private values animate out, leaving just the imports and exports
// When you zoom out and even the imports/exports get too small to read, they are hidden as well and the module is just shown as a circle around the name, with arrows displaying the flow of dependencies in your project
// TODO should do a similar thing for function definitions: when zooming out, the body should animate out, leaving just the function signature

export type ModuleProps = ExpressionProps<DustExpression.Module>;

// TODO! make modules zoomable: drag and drop with 1 pointer, and zoom in/out with either 2 pointers or control+scroll (normal scroll should scroll the window vertically and shift+scroll should scroll horizontally)
// Don't forget to make the PhysicsElement diameter reflect the css scale transform
// Also don't forget to show/hide elements at various zoom levels according to priority
export const Module: Component<ModuleProps> = (props) => {
  let moduleElement: HTMLPhysicsSimulationElement;
  let moduleName: HTMLPhysicsSimulationElement;

  // function mountModule(moduleElement: HTMLPhysicsSimulationElement) {
  //   console.debug("Mounting Module:", moduleElement);
  //   moduleElementRef = moduleElement;
  //   moduleElement.state = "free";
  //   // console.log("")
  //   moduleElement.offsetDiameter = 1000;
  //   moduleElement.callbacks = {
  //     onSimulationFrame: updateModule,
  //     playSimulation: props.playSimulation,
  //   };
  // }

  onMount(() => {
    console.log("Module onmount");
    moduleElement.state = "free";
    // console.log("")
    moduleElement.offsetDiameter = 1000;
    moduleElement.callbacks = {
      onSimulationFrame: updateModule,
      playSimulation: props.playSimulation,
    };

    moduleName.state = "pinned";
    moduleName.centeredWithinParent = true;
    updateWrapper(moduleName);
    moduleName.callbacks = {
      onSimulationFrame: updateWrapper,
      playSimulation: props.playSimulation,
    };
  });

  return (
    <dust-physics-simulation-element
      id={props.id}
      class="Dust module"
      ref={moduleElement!}
    >
      <button onClick={() => (moduleElement!.offsetDiameter += 20)}>
        grow
      </button>
      <button onClick={() => (moduleElement!.offsetDiameter -= 20)}>
        shrink
      </button>
      {/* TODO add a way to add and remove elements */}

      <span id="debug_info"></span>

      <dust-physics-simulation-element
        class="Dust moduleElement moduleName"
        ref={moduleName!}
      >
        <DustExpressionView
          {...{
            ...props,
            id: props.id + "/name",
            expression: props.expression.name,
            depthLimit: props.depthLimit - 1,
          }}
        />
        <span id="debug_info"></span>
      </dust-physics-simulation-element>
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
    </dust-physics-simulation-element>
  );
};

const ModuleElementList: Component<{
  baseProps: ModuleProps;
  visibility: "public" | "private";
  expressions: readonly DustExpression.Any[];
}> = (props) => (
  <For each={props.expressions}>
    {(expression, index) => (
      <IntoHTMLPhysicsSimulationComponent
        classList={{
          Dust: true,
          moduleElement: true,
          [props.visibility]: true,
        }}
        playSimulation={props.baseProps.playSimulation}
      >
        <DustExpressionView
          {...{
            ...props.baseProps,
            id: props.baseProps.id + index(),
            expression,
          }}
        />
      </IntoHTMLPhysicsSimulationComponent>
    )}
  </For>
);

function updateModule(moduleElement: HTMLPhysicsSimulationElement) {
  const physicsElements = getDirectPhysicsElementChildren(moduleElement);

  const smallestDiameter =
    approximateSmallestEnclosingCircle(physicsElements).diameter;

  if (moduleElement.offsetDiameter < smallestDiameter) {
    moduleElement.offsetDiameter = smallestDiameter;
  }

  updateForces(moduleElement, physicsElements);
}

function updateForces(
  moduleElement: HTMLPhysicsSimulationElement,
  physicsElements: readonly HTMLPhysicsSimulationElement[],
) {
  const idealGapBetweenElements = 20;

  const collisionSpringConstant = 100; // 1/(millis^2): strongly repel colliding elements

  const spreadSpringConstant = 0.25; // gently spread all elements away from all others

  const publicElementsToBorderSpringConstant = 100; // Strongly pull towards the module's border
  const privateElementsToCenterSpringConstant = 20; // Strongly pull toowards the center

  let sumOfPublicElementGapsToBorder = 0;
  let sumOfPrivateElementGapsToBorder = 0;

  for (const element of physicsElements) {
    if (element.classList.contains("public")) {
      Springs.connectBorders(
        element,
        moduleElement,
        publicElementsToBorderSpringConstant,
        -element.diameter,
      );
      sumOfPublicElementGapsToBorder += Springs.keepWithin(
        element,
        moduleElement,
        collisionSpringConstant * 2,
        0,
      );
    } else {
      // TODO put this force on the moduleElement rather than the moduleName
      Springs.connectBorders(
        element,
        moduleElement,
        privateElementsToCenterSpringConstant,
        -moduleElement.diameter / 2,
      );
      sumOfPrivateElementGapsToBorder += Springs.keepWithin(
        element,
        moduleElement,
        collisionSpringConstant * 2,
        idealGapBetweenElements,
      );
    }
  }

  let sumOfGapsBetweenElements = 0;
  // TODO sumOfGapsBetweenNearbyElements
  let sumOfGapsBetweenOverlappingElements = 0;
  for (let i = 0; i < physicsElements.length; i++) {
    const first = physicsElements[i];
    for (let j = i + 1; j < physicsElements.length; j++) {
      const second = physicsElements[j];
      Springs.connectCenters(
        first,
        second,
        spreadSpringConstant,
        moduleElement.diameter,
      );
      const gap = Springs.preventCollisions(
        first,
        second,
        collisionSpringConstant,
        idealGapBetweenElements,
      );
      sumOfGapsBetweenElements += gap;
      if (gap < 0) {
        sumOfGapsBetweenOverlappingElements += gap;
      }
    }
  }

  // TODO show the total force on the moduleElement as well. moduleName forces should be just from collisions
  // TODO calculate average overlap between elements, as well as average distance of public/private elements to border

  // TODO use these to grow/shrink the module automatically
  // TODO calculate module area and compare it to sum of element areas

  // TODO use average distance of public elements to border to grow/shrink the module
  // also grow the module if any private elements end up touching the border
}
