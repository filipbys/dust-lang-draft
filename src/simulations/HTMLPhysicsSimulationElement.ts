import type { Circle } from "../math/Geometry";
import { rounded, Vector2D, vectorsEqual, X, Y } from "../math/Vectors";
import {
  PhysicsSimulationElement,
  PhysicsSimulationElementState,
} from "./PhysicsSimulationV2";
import { centerWithinParent, setDiameter, setTranslate } from "./HTMLHelpers";
import { makeDraggable } from "./DragAndDrop";

export type HTMLPhysicsSimulationElementCallbacks = Readonly<{
  /**
   * Called when something in the element changes and the simulation needs to be played.
   */
  playSimulation(): void;
  /**
   * Called on each frame when the simulation is playing.
   *
   * @param element the element that owns these callbacks.
   */
  onSimulationFrame(element: HTMLPhysicsSimulationElement): void;
}>;

export class HTMLPhysicsSimulationElement
  extends HTMLElement
  implements Circle, PhysicsSimulationElement
{
  static readonly TAG = "dust-physics-simulation-element";

  // TODO set the state as a css class or attribute
  // TODO should also play the simulation when set, right?
  state: PhysicsSimulationElementState = "pinned";

  #callbacks?: HTMLPhysicsSimulationElementCallbacks;

  readonly force: Vector2D = [0, 0]; // pixels/millis^2
  velocity: Readonly<Vector2D> = [0, 0]; // pixels/millis

  #center: Readonly<Vector2D> = [0, 0];
  #diameter: number = 100;
  #mass: number = 100; // TODO
  #centeredWithinParent: boolean = false;

  #previousCssDiameter: number = 0; // pixels, rounded to nearest integer
  #previousCssTranslate: Readonly<Vector2D> = [0, 0]; // pixels, rounded to nearest integers

  constructor() {
    super();
    makeDraggable(this);
    this.#updateStyle();
  }

  #updateStyle(): boolean {
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

  set callbacks(callbacks: HTMLPhysicsSimulationElementCallbacks) {
    this.#callbacks = callbacks;
  }

  get center() {
    return this.#center;
  }

  set center(newCenter: Readonly<Vector2D>) {
    this.#center = newCenter;
    if (this.#updateStyle()) {
      this.#callbacks?.playSimulation();
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

    if (this.#updateStyle()) {
      this.#callbacks?.playSimulation();
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
      this.#callbacks?.playSimulation();
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
      this.#callbacks?.playSimulation();
    }
  }

  simulationFrameCallback() {
    this.#updateStyle();
    this.#callbacks?.onSimulationFrame(this);
  }

  connectedCallback() {
    if (this.isConnected) {
      this.simulationFrameCallback();
      // TODO observe children sizes and auto-play the simulation?
    }
  }
}
