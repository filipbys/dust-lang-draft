import {
  children,
  Component,
  ComponentProps,
  createEffect,
  Match,
  on,
  onCleanup,
  onMount,
  ParentProps,
  Ref,
  Switch,
} from "solid-js";
import { filterByType } from "../data-structures/Arrays";
import { offsetDiameter, rectangleDiameter } from "../math/Geometry";
import { PhysicsElement } from "../math/Physics";

import { HTMLPhysicsSimulationElement } from "../simulations/HTMLPhysicsSimulationElement";
import { PhysicsSimulationElementState } from "../simulations/PhysicsSimulation";
import { safeCast } from "../type-utils/DynamicTypeChecks";
import { observeChildrenSizes } from "../observers/ChildSizeMutationObserver";

type HTMLPhysicsSimulationElementProps = ComponentProps<"element"> &
  ParentProps<{
    ref?: Ref<HTMLPhysicsSimulationElement>;
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

  let wrapper: HTMLPhysicsSimulationElement | null = null;
  onMount(() => {
    if (wrapper === null) {
      return;
    }
    wrapper.callbacks = {
      onSimulationFrame: updateWrapper,
      playSimulation: props.playSimulation,
    };

    wrapper.state = "free";
    wrapper.centeredWithinParent = true;
    updateWrapper(wrapper);

    const cleanup = observeChildrenSizes(
      wrapper,
      HTMLElement,
      updateWrapperDiameter2,
    );

    onCleanup(cleanup);
  });

  return (
    <Switch>
      <Match when={resolvedChildren() instanceof HTMLPhysicsSimulationElement}>
        {resolvedChildren()}
      </Match>
      <Match
        when={!(resolvedChildren() instanceof HTMLPhysicsSimulationElement)}
      >
        <dust-physics-simulation-element
          ref={wrapper!}
          {...props}
        >
          {resolvedChildren()}
          {/* <span id="debug_info"></span> */}
        </dust-physics-simulation-element>
      </Match>
    </Switch>
  );
};

function updateWrapperDiameter2(
  wrapper: HTMLPhysicsSimulationElement,
  children: readonly HTMLElement[],
) {
  // TODO uncomment when done debugging
  // if (children.length !== 1) {
  //   throw `Wrapper physics element must have exactly 1 child, got ${wrapper.childElementCount}`;
  // }
  updateWrapper(wrapper);
}

// TODO export a BubbleWrapper component instead
export function updateWrapper(wrapper: HTMLPhysicsSimulationElement) {
  // TODO uncomment when done debugging
  // if (wrapper.childElementCount !== 1) {
  //   throw `Wrapper physics element must have exactly 1 child, got ${wrapper.childElementCount}`;
  // }
  const wrappedElement = safeCast(wrapper.firstElementChild!, HTMLElement);
  console.info(
    "updateWrapperDiameter",
    wrapper,
    wrapper.offsetDiameter,
    offsetDiameter(wrapper),
    wrappedElement,
    offsetDiameter(wrappedElement),
  );
  // TODO cleanup
  wrapper.offsetDiameter = Math.max(1, offsetDiameter(wrappedElement));

  wrappedElement.style.position = "absolute";
  wrappedElement.style.left = `calc(50% - ${wrappedElement.offsetWidth / 2}px)`;
  wrappedElement.style.top = `calc(50% - ${wrappedElement.offsetHeight / 2}px)`;

  // TODO set the element's mass based on the number of characters in the expression
}

export function getAllPhysicsElements(
  element: HTMLElement,
): HTMLCollectionOf<HTMLPhysicsSimulationElement> {
  return element.getElementsByTagName(
    HTMLPhysicsSimulationElement.TAG,
  ) as HTMLCollectionOf<HTMLPhysicsSimulationElement>;
}

export function getDirectPhysicsElementChildren(
  element: HTMLPhysicsSimulationElement,
): HTMLPhysicsSimulationElement[] {
  return filterByType(element.children, HTMLPhysicsSimulationElement);
}
