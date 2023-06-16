import { PhysicsSimulationElement } from "../../math/PhysicsSimulationV2";

export type Edge = [number, number]; // TODO support edges with associated data

export interface HTMLPhysicsSimulationElement extends PhysicsSimulationElement {
  readonly borderElement: HTMLElement;
  readonly contents: HTMLElement;
}
