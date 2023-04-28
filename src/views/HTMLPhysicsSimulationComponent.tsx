import {
  Component,
  ComponentProps,
  Match,
  ParentProps,
  Ref,
  Switch,
} from "solid-js";
import { filterByType } from "../data-structures/Arrays";
import { elementDiameter, rectangleDiameter } from "../math/Geometry";
import { centerRectangleWithinParent } from "../simulations/HTMLHelpers";

import { HTMLPhysicsSimulationElement } from "../simulations/HTMLPhysicsSimulationElement";
import { safeCast } from "../type-utils/DynamicTypeChecks";

type HTMLPhysicsSimulationElementProps = ComponentProps<"element"> &
  ParentProps<{
    ref?: (element: HTMLPhysicsSimulationElement) => void;
  }>;

declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements {
      [HTMLPhysicsSimulationElement.TAG]: HTMLPhysicsSimulationElementProps;
    }
  }
}

export const IntoHTMLPhysicsSimulationComponent: Component<
  ComponentProps<"element"> & ParentProps<{ playSimulation: () => void }>
> = (props) => (
  <Switch>
    <Match when={props.children instanceof HTMLPhysicsSimulationElement}>
      {props.children}
    </Match>
    <Match when={!(props.children instanceof HTMLPhysicsSimulationElement)}>
      <dust-physics-simulation-element
        {...{
          ...props,
          ref(element) {
            element.state = "free";
            element.centeredWithinParent = true;
            element.initialize({
              simulationFrameCallback: updateWrapperDiameter,
              playSimulation: props.playSimulation,
            });
            // TODO try to preserve the current position?
          },
        }}
      >
        {props.children}
        <span id="debug_info"></span>
      </dust-physics-simulation-element>
    </Match>
  </Switch>
);

// TODO export a BubbleWrapper component instead
export function updateWrapperDiameter(wrapper: HTMLPhysicsSimulationElement) {
  // TODO uncomment
  // if (wrapper.childElementCount !== 1) {
  //   throw `Wrapper physics element must have exactly 1 child, got ${wrapper.childElementCount}`;
  // }
  console.info("updateWrapperDiameter", wrapper);
  const wrappedElement = safeCast(wrapper.firstElementChild!, HTMLElement);
  wrapper.diameter = Math.max(1, elementDiameter(wrappedElement));
  // centerRectangleWithinParent(wrappedElement, boundingBox);

  // TODO set the element's mass based on the number of characters in the expression
}

export function getAllPhysicsElements(
  element: HTMLPhysicsSimulationElement
): HTMLCollectionOf<HTMLPhysicsSimulationElement> {
  return element.getElementsByTagName(
    HTMLPhysicsSimulationElement.TAG
  ) as HTMLCollectionOf<HTMLPhysicsSimulationElement>;
}

export function getDirectPhysicsElementChildren(
  element: HTMLPhysicsSimulationElement
): HTMLPhysicsSimulationElement[] {
  return filterByType(element.children, HTMLPhysicsSimulationElement);
}
