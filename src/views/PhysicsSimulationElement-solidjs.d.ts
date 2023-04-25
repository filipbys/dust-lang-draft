import type { ComponentProps } from "solid-js";
import type {
  PhysicsSimulationElement,
  PhysicsSimulationElementProps,
} from "../simulations/PhysicsSimulationElement";

declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements {
      [PhysicsSimulationElement.TAG]: ComponentProps<"div"> &
        PhysicsSimulationElementProps;
    }
  }
}
