import {
  Component,
  ComponentProps,
  Match,
  ParentProps,
  Ref,
  Switch,
} from "solid-js";
import { elementDiameter } from "../math/Geometry";

import { HTMLPhysicsSimulationElement } from "../simulations/HTMLPhysicsSimulationElement";

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
            element.setDynamicProperties({
              simulationFrameCallback: updateWrapperDiameter,
              playSimulation: props.playSimulation,
            });
            // TODO try to preserve the current position?
          },
        }}
      >
        {props.children}
      </dust-physics-simulation-element>
    </Match>
  </Switch>
);

// TODO export a BubbleWrapper component instead
export function updateWrapperDiameter(wrapper: HTMLPhysicsSimulationElement) {
  if (wrapper.childElementCount !== 1) {
    throw `Wrapper physics element must have exactly 1 child, got ${wrapper.childElementCount}`;
  }
  const wrappedElement = wrapper.firstElementChild!;
  wrapper.diameter = elementDiameter(wrappedElement);

  // TODO set the element's mass based on the number of characters in the expression
}

export function getDirectPhysicsElementChildren(
  element: HTMLPhysicsSimulationElement
): HTMLCollectionOf<HTMLPhysicsSimulationElement> {
  return element.getElementsByTagName(
    HTMLPhysicsSimulationElement.TAG
  ) as HTMLCollectionOf<HTMLPhysicsSimulationElement>;
}
