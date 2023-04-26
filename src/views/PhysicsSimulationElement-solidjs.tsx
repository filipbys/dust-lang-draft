import type { Component, ComponentProps, ParentProps, Ref } from "solid-js";
import type {
  PhysicsSimulationElement,
  PhysicsSimulationElementProps,
} from "../simulations/PhysicsSimulationElement";
import { ExpressionProps } from "./DustExpressionView";
import type * as DustExpression from "../types/DustExpression";

declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements {
      [PhysicsSimulationElement.TAG]: ParentProps & {
        ref: Ref<PhysicsSimulationElement>;
      };
    }
  }
}

type PhysicsSimulationElementComponentProps = PhysicsSimulationElementProps &
  ParentProps &
  ExpressionProps<DustExpression.Any>;

export const PhysicsSimulationElementComponent: Component<PhysicsSimulationElementComponentProps> =
  (props) => {
    return (
      <dust-physics-simulation-element ref={(it) => it.init(props)}>
        {props.children}
      </dust-physics-simulation-element>
    );
  };
