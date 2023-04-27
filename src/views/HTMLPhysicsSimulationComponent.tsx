import type { Component, ComponentProps, ParentProps, Ref } from "solid-js";

import {
  HTMLPhysicsSimulationElement,
  PhysicsSimulationElementProps,
} from "../simulations/HTMLPhysicsSimulationElement";

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
    dynamicProps: PhysicsSimulationElementProps;
  };

ty3=wpe HTMLPhysicsSimulationElementProps = ComponentProps<"element"> &
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
