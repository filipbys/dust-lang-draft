import { Circle, rectangleDiameter } from "../math/Geometry";
import {
  rounded,
  Vector2D,
  vectorBetween,
  vectorsEqual,
  X,
  Y,
} from "../math/Vectors";
import {
  PhysicsSimulationElement,
  PhysicsSimulationElementState,
} from "./PhysicsSimulation";
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
  #previousCssTranslate: Readonly<Vector2D> = [0, 0]; // pixels, rounded to nearest integers

  #offsetDiameter: number = 0;
  #previousCssDiameter: number = 0; // pixels, rounded to nearest integer

  #scale = 1.0;

  #mass: number = 100; // TODO

  constructor() {
    super();
    this.offsetDiameter = 100;
    makeDraggable(this);
  }

  set callbacks(callbacks: HTMLPhysicsSimulationElementCallbacks) {
    this.#callbacks = callbacks;
  }

  get center(): Readonly<Vector2D> {
    return this.#center;
  }

  set center(newCenter: Readonly<Vector2D>) {
    this.#center = newCenter;
    const roundedCenter = rounded(this.#center);
    if (!vectorsEqual(this.#previousCssTranslate, roundedCenter)) {
      this.#previousCssTranslate = roundedCenter;
      this.style.setProperty("--center-x", roundedCenter[X] + "px");
      this.style.setProperty("--center-y", roundedCenter[Y] + "px");
      this.#callbacks?.playSimulation();
    }
  }

  get offsetDiameter() {
    return this.#offsetDiameter;
  }

  set offsetDiameter(newOffsetDiameter: number) {
    if (newOffsetDiameter <= 0) {
      throw new RangeError(
        `Diameter must be positive, got ${newOffsetDiameter}`,
      );
    }
    this.#offsetDiameter = newOffsetDiameter;

    const cssDiameter = Math.round(newOffsetDiameter);
    if (this.#previousCssDiameter !== cssDiameter) {
      this.#previousCssDiameter = cssDiameter;
      this.style.setProperty("--diameter", cssDiameter + "px");
      this.#callbacks?.playSimulation();
    }
  }

  get diameter() {
    return this.#offsetDiameter * this.#scale;
  }

  get scale() {
    return this.#scale;
  }

  set scale(newScale: number) {
    if (newScale <= 0) {
      throw new RangeError(`Scale must be positive, got ${newScale}`);
    }
    if (newScale !== this.#scale) {
      this.#scale = newScale;
      this.style.setProperty("--scale", newScale.toString());
      this.#callbacks?.playSimulation();
    }
  }

  get clientScale(): number {
    return this.getBoundingClientRect().width / this.#offsetDiameter;
  }

  get clientTopLeft(): Vector2D {
    const box = this.getBoundingClientRect();
    return [box.left, box.top];
  }

  set clientTopLeft(newTopLeft: Readonly<Vector2D>) {
    const box = this.getBoundingClientRect();

    const scale = box.width / this.#offsetDiameter; // client pixels / css pixels
    const delta = vectorBetween([box.left, box.top], newTopLeft);

    this.center = [
      this.center[X] + delta[X] * scale,
      this.center[Y] + delta[Y] * scale,
    ];

    console.assert(
      vectorsEqual(this.clientTopLeft, newTopLeft),
      this.clientTopLeft,
      newTopLeft,
    );
  }

  get centeredWithinParent() {
    return this.classList.contains("centeredWithinParent");
  }

  set centeredWithinParent(newValue: boolean) {
    if (this.centeredWithinParent !== newValue) {
      this.classList.toggle("centeredWithinParent", newValue);
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

  simulationFrameCallback() {
    this.#callbacks?.onSimulationFrame(this);
  }

  connectedCallback() {
    if (this.isConnected) {
      this.simulationFrameCallback();
    }
  }
}
