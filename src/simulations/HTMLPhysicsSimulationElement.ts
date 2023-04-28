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
import { makeDraggable } from "./DragAndDrop";

// TODO there are really two kinds of elements:
// Bubbles, which hold a single HTMLElement of any kind, and update their diameter whenever the wrapped value's size changes using a ResizeObserver.
// Collections, which hold multiple other physics elements and have an updateForces() function

export type HTMLPhysicsSimulationElementProps = Readonly<{
  simulationFrameCallback: (element: HTMLPhysicsSimulationElement) => void;
  playSimulation: () => void;
}>;

export class HTMLPhysicsSimulationElement
  extends HTMLElement
  implements Circle, PhysicsSimulationElement
{
  static readonly TAG = "dust-physics-simulation-element";

  // TODO set the state as a css class or attribute
  // TODO should also play the simulation when set, right?
  state: PhysicsSimulationElementState = "pinned";

  #dynamicProperties?: HTMLPhysicsSimulationElementProps;

  readonly force: Vector2D = [0, 0]; // pixels/millis^2
  velocity: Readonly<Vector2D> = [0, 0]; // pixels/millis

  #center: Readonly<Vector2D> = [0, 0];
  #diameter: number = 100;
  #mass: number = 100; // TODO
  #centeredWithinParent: boolean = true;

  #previousCssDiameter: number = 0; // pixels, rounded to nearest integer
  #previousCssTranslate: Readonly<Vector2D> = [0, 0]; // pixels, rounded to nearest integers

  initialize(props: HTMLPhysicsSimulationElementProps) {
    console.log("PhysicsSimulationElement.init:", this, props);
    this.#dynamicProperties = props;
    this.#updateHTMLProperties();
    makeDraggable(this);
  }

  #updateHTMLProperties(): boolean {
    let changed = false;

    const roundedCenter = rounded(this.#center);
    if (!vectorsEqual(this.#previousCssTranslate, roundedCenter)) {
      // TODO observe jank and measure perf with/without this optimization
      setTranslate(this, roundedCenter);
      this.#previousCssTranslate = roundedCenter;
      changed = true;
    }

    const roundedDiameter = Math.round(this.#diameter);
    if (this.#previousCssDiameter !== roundedDiameter) {
      setDiameter(this, roundedDiameter, this.#centeredWithinParent);
      this.#previousCssDiameter = roundedDiameter;
      changed = true;
    }

    return changed;
  }

  get center() {
    return this.#center;
  }

  set center(newCenter: Readonly<Vector2D>) {
    this.#center = newCenter;
    if (this.#updateHTMLProperties()) {
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

    if (this.#updateHTMLProperties()) {
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
      if (newValue) {
        centerWithinParent(this, this.diameter);
      }
      this.#dynamicProperties!.playSimulation();
    }
  }

  simulationFrameCallback() {
    this.#updateHTMLProperties();
    this.#dynamicProperties!.simulationFrameCallback(this);
  }
}
