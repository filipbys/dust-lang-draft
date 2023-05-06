import {
  Component,
  ComponentProps,
  ParentProps,
  onCleanup,
  onMount,
} from "solid-js";
import { HTMLPhysicsSimulationElement } from "../html-custom-elements/HTMLPhysicsSimulationElement";
import { PhysicsSimulationElementState } from "../math/PhysicsSimulation";
import { observeChildrenSizes } from "../observers/ChildSizeMutationObserver";
import { safeCast } from "../type-utils/DynamicTypeChecks";
import { offsetDiameter } from "../math/Geometry";

export const BubbleWrapper: Component<
  ComponentProps<"element"> &
    ParentProps<{
      state: PhysicsSimulationElementState;
      playSimulation: () => void;
      extraClasses: {};
    }>
> = (props) => {
  let wrapper: HTMLPhysicsSimulationElement;

  onMount(() => {
    wrapper.callbacks = {
      onSimulationFrame: updateBubbleWrapper,
      playSimulation: props.playSimulation,
    };

    wrapper.state = props.state;
    wrapper.centeredWithinParent = true;
    updateBubbleWrapper(wrapper);

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
        ...props.extraClasses,
        bubbleWrapper: true,
      }}
      {...props}
    >
      {props.children}
      {/* <span id="debug_info"></span> */}
    </dust-physics-simulation-element>
  );
};

// TODO export a BubbleWrapper component instead
function updateBubbleWrapper(wrapper: HTMLPhysicsSimulationElement) {
  // TODO uncomment when done debugging
  // if (wrapper.childElementCount !== 1) {
  //   throw `Wrapper physics element must have exactly 1 child, got ${wrapper.childElementCount}`;
  // }
  const wrappedElement = safeCast(wrapper.firstElementChild!, HTMLElement);

  wrappedElement.classList.add("centeredWithinParent"); // TODO add this in the jsx
  wrapper.offsetDiameter = Math.max(1, offsetDiameter(wrappedElement));

  // TODO set the element's mass based on the number of characters in the expression
}
