import type { Component, ComponentProps, ParentProps, Ref } from "solid-js";

import { ExpressionProps } from "./DustExpressionView";
import type * as DustExpression from "../types/DustExpression";
import { PhysicsSimulationElement } from "../simulations/PhysicsSimulationV2";

type PhysicsSimulationElementComponentProps = ComponentProps<"element"> &
  ParentProps<{
    ref?: (element: PhysicsSimulationElement) => void;
    physicsProps: PhysicsSimulationElementProps;
  }>;

declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements {
      "dust-physics-simulation-element": PhysicsSimulationElementComponentProps;
    }
  }
}



export const PhysicsSimulationElementComponent: Component<PhysicsSimulationElementComponentProps> =
  (props) => {
    return (
      <dust-physics-simulation-element
        {...props}
        ref={(it) => {
          console.log("PhysicsSimulationElementComponent ref", it);
          it.initialize(props.physicsProps);
          if (props.ref) {
            props.ref(it);
          }
        }}
      >
        {props.children}
      </dust-physics-simulation-element>
    );
  };
