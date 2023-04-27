import type { Component, ComponentProps, ParentProps, Ref } from "solid-js";

import {
  HTMLPhysicsSimulationElement,
  PhysicsSimulationElementProps,
} from "../simulations/HTMLPhysicsSimulationElement";

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

type PhysicsSimulationElementComponentProps =
  HTMLPhysicsSimulationElementProps & {
    dynamicProps: PhysicsSimulationElementProps;
  };

export const PhysicsSimulationElementComponent: Component<PhysicsSimulationElementComponentProps> =
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
