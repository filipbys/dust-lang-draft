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

export const HTMLPhysicsSimulationComponent: Component<PhysicsSimulationElementComponentProps> =
  (props) => {
    return (
      <dust-physics-simulation-element
        {...props}
        ref={(it) => {
          console.log("PhysicsSimulationElementComponent ref", it);
          it.setDynamicProperties(props.dynamicProps);
          if (props.ref) {
            props.ref(it);
          }
        }}
      >
        {props.children}
      </dust-physics-simulation-element>
    );
  };

export type PhysicsSimulationElementComponentProps =
  HTMLPhysicsSimulationElementProps & {
    dynamicProps: HTMLPhysicsSimulationElementProps;
  };

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
  ParentProps & {
    playSimulation: () => void;
  }
> = (props) => (
  <Switch>
    <Match when={props.children instanceof HTMLPhysicsSimulationElement}>
      {props.children}
    </Match>
    <Match when={!(props.children instanceof HTMLPhysicsSimulationElement)}>
      <HTMLPhysicsSimulationComponent
        {...{
          dynamicProps: {
            simulationFrameCallback: (
              element: HTMLPhysicsSimulationElement
            ) => {
              if (element.childElementCount !== 1) {
                throw `Wrapper physics element must have exactly 1 child, got ${element.childElementCount}`;
              }
              const wrappedElement = element.firstElementChild!;
              element.diameter = elementDiameter(wrappedElement);
            },
            playSimulation: props.playSimulation,
          },
          ref(element) {
            element.state = "free";
            element.centeredWithinParent = true;
            // TODO try to preserve the current position?
          },
        }}
      />
    </Match>
  </Switch>
);

function bubbleSimulationFrameCallback() {}
