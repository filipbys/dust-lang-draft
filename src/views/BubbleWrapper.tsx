import {
  Component,
  ComponentProps,
  ParentProps,
  onCleanup,
  onMount,
} from "solid-js";
import { HTMLPhysicsSimulationElement } from "../html-custom-elements/HTMLPhysicsSimulationElement";
import { observeChildrenSizes } from "../observers/ChildSizeMutationObserver";
import { safeCast } from "../type-utils/DynamicTypeChecks";
import { offsetDiameter } from "../math/Geometry";

export function BubbleWrapper(
  props: ComponentProps<"element"> &
    ParentProps<{
      state: "free" | "pinned";
      playPhysicsSimulation: () => void;
      extraClasses: {};
    }>,
) {
  let wrapper: HTMLPhysicsSimulationElement;

  onMount(() => {
    wrapper.playPhysicsSimulation = props.playPhysicsSimulation;

    wrapper.state = props.state;
    wrapper.centeredWithinParent = true;

    const cleanup = observeChildrenSizes(
      wrapper,
      HTMLElement,
      updateBubbleWrapper,
    );
    onCleanup(cleanup);
  });

  return (
    <dust-physics-simulation-element
      ref={wrapper!}
      classList={{
        bubbleWrapper: true,
        ...props.extraClasses,
      }}
      {...props}
    >
      {/* <span class="debug_info"></span> */}
      {props.children}
    </dust-physics-simulation-element>
  );
}

function updateBubbleWrapper(wrapper: HTMLPhysicsSimulationElement) {
  // TODO uncomment when done debugging
  // if (wrapper.childElementCount !== 1) {
  //   throw `Wrapper physics element must have exactly 1 child, got ${wrapper.childElementCount}`;
  // }
  const wrappedElement = safeCast(wrapper.firstElementChild!, HTMLElement);

  wrapper.offsetDiameter = Math.max(1, offsetDiameter(wrappedElement));

  // TODO set the element's mass based on the number of characters in the expression
}
