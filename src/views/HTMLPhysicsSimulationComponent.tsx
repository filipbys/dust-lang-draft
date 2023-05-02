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
import { PhysicsElement } from "../math/Physics";
import { HTMLPhysicsSimulationElement } from "../simulations/HTMLPhysicsSimulationElement";
import { PhysicsSimulationElementState } from "../simulations/PhysicsSimulation";
import { BubbleWrapper } from "./BubbleWrapper";

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
  ComponentProps<"element"> &
    ParentProps<{ playSimulation: () => void; extraClasses: {} }>
> = (props) => {
  // TODO this is only ever used with a single DustExpressionView as its child ==> inline that and just take the expression directly through the props. Then instead of checking the instance type, we can just write (props.expression.kind === "module")
  const resolvedChildren = children(() => props.children);
  const isPhysicsElement = () => {
    const resolvedChild = resolvedChildren();
    return (
      resolvedChild instanceof HTMLElement &&
      resolvedChild.tagName.toLowerCase() === HTMLPhysicsSimulationElement.TAG
    );
  };
  // TODO need to add CSS classes to the physics element if unwrapped
  return (
    <Switch>
      <Match when={isPhysicsElement()}>{resolvedChildren()}</Match>
      <Match when={!isPhysicsElement()}>
        <BubbleWrapper state="free" {...props}>
          {resolvedChildren()}
        </BubbleWrapper>
      </Match>
    </Switch>
  );
};

// TODO move to another file
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
