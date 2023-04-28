import {
  children,
  Component,
  ComponentProps,
  Match,
  ParentProps,
  Ref,
  Switch,
} from "solid-js";
import { filterByType } from "../data-structures/Arrays";
import { elementDiameter, rectangleDiameter } from "../math/Geometry";
import { PhysicsElement } from "../math/Physics";
import { centerRectangleWithinParent } from "../simulations/HTMLHelpers";

import { HTMLPhysicsSimulationElement } from "../simulations/HTMLPhysicsSimulationElement";
import { PhysicsSimulationElementState } from "../simulations/PhysicsSimulationV2";
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

    interface ExplicitProperties extends PhysicsElement {
      state: PhysicsSimulationElementState;
    }
  }
}

export const IntoHTMLPhysicsSimulationComponent: Component<
  ComponentProps<"element"> & ParentProps<{ playSimulation: () => void }>
> = (props) => {
  const resolvedChildren = children(() => props.children);
  return (
    <Switch>
      <Match when={resolvedChildren() instanceof HTMLPhysicsSimulationElement}>
        {resolvedChildren()}
      </Match>
      <Match
        when={!(resolvedChildren() instanceof HTMLPhysicsSimulationElement)}
      >
        <dust-physics-simulation-element
          prop:state={"foo"}
          {...{
            ...props,
            ref(element) {
              // TODO try using prop:xyz and @once for these (see https://www.solidjs.com/docs/latest#-once-)
              element.callbacks = {
                onSimulationFrame: updateWrapperDiameter,
                playSimulation: props.playSimulation,
              };

              element.state = "free";
              element.centeredWithinParent = true;
              // TODO try to preserve the current position?
            },
          }}
        >
          {resolvedChildren()}
          <span id="debug_info"></span>
        </dust-physics-simulation-element>
      </Match>
    </Switch>
  );
};

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
