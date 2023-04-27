import { elementDiameter } from "../math/Geometry";
import type { Circle } from "../math/Geometry";
import { rounded, Vector2D, vectorsEqual, X, Y } from "../math/Vectors";
import { PhysicsElement } from "../math/Physics";
import { PhysicsSimulation } from "./PhysicsSimulation";
import { bubbleElementResizeObserverOptions } from "./BubbleElementResizeObserver";
import {
  PhysicsSimulationElement,
  PhysicsSimulationElementState,
} from "./PhysicsSimulationV2";
import { centerWithinParent, setDiameter, setTranslate } from "./HTMLHelpers";

// TODO there are really two kinds of elements:
// Bubbles, which hold a single HTMLElement of any kind, and update their diameter whenever the wrapped value's size changes using a ResizeObserver.
// Collections, which hold multiple other physics elements and have an updateForces() function

export type PhysicsSimulationElementProps = Readonly<{
  simulationFrameCallback: () => void;
  playSimulation: () => void;
}>;

export class HTMLPhysicsSimulationElement
  extends HTMLElement
  implements Circle, PhysicsSimulationElement
{
  static readonly TAG = "dust-physics-simulation-element";

  state: PhysicsSimulationElementState = "pinned";
  #dynamicProperties?: PhysicsSimulationElementProps;

  readonly force: Vector2D = [0, 0]; // pixels/millis^2
  velocity: Readonly<Vector2D> = [0, 0]; // pixels/millis

  #center: Readonly<Vector2D> = [0, 0];
  #diameter: number = 100;
  #mass: number = 100; // TODO
  #centeredWithinParent: boolean = false;

  #previousCssDiameter: number = 0; // pixels, rounded to nearest integer
  #previousCssTranslate: Readonly<Vector2D> = [0, 0]; // pixels, rounded to nearest integers

  setDynamicProperties(props: PhysicsSimulationElementProps) {
    console.log("PhysicsSimulationElement.init:", this, props);
    this.#dynamicProperties = props;
  }

  get center() {
    return this.#center;
  }

  set center(newCenter: Readonly<Vector2D>) {
    this.#center = newCenter;
    if (!vectorsEqual(this.#previousCssTranslate, rounded(newCenter))) {
      this.#dynamicProperties!.playSimulation();
    }
  }

  get diameter() {
    return this.#diameter;
  }

  set diameter(newDiameter: number) {
    if (newDiameter <= 0) {
      throw new RangeError(`Diameter must be positive, got ${newDiameter}`);
    }
    this.#diameter = newDiameter;
    if (this.#previousCssDiameter !== Math.round(newDiameter)) {
      this.#dynamicProperties!.playSimulation();
    }
  }

  get mass() {
    return this.#mass;
  }

  set mass(newMass: number) {
    if (newMass <= 0) {
      throw new RangeError(`Mass must be positive, got ${newMass}`);
    }
    if (this.#mass !== newMass) {
      this.#mass = newMass;
      this.#dynamicProperties!.playSimulation();
    }
  }

  setBoundary(boundary: Circle) {
    this.center = boundary.center;
    this.diameter = boundary.diameter;
  }

  get centeredWithinParent() {
    return this.#centeredWithinParent;
  }

  set centeredWithinParent(newValue: boolean) {
    if (this.#centeredWithinParent !== newValue) {
      this.#centeredWithinParent = newValue;
      this.#dynamicProperties!.playSimulation();
    }
  }

  simulationFrameCallback() {
    const newDiameter = Math.round(this.#diameter);
    if (this.#previousCssDiameter !== newDiameter) {
      setDiameter(this, this.#diameter, this.#centeredWithinParent);
      this.#previousCssDiameter = newDiameter;
    }

    const newTranslate = rounded(this.#center);
    if (!vectorsEqual(this.#previousCssTranslate, newTranslate)) {
      // TODO observe jank and measure perf with/without this optimization
      setTranslate(this, newTranslate);
      this.#previousCssTranslate = newTranslate;
    }

    this.#dynamicProperties?.simulationFrameCallback();
  }
}
