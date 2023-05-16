import { Circle } from "../math/Geometry";
import {
  distanceBetween,
  isVectorFinite,
  Vector2D,
  vectorsEqual,
  X,
  Y,
} from "../math/Vectors";
import {
  PhysicsSimulationElement,
  PhysicsSimulationElementState,
} from "../math/PhysicsSimulation";
import { makeDraggableAndZoomable } from "./DragZoomAndDrop";

import "./HTMLPhysicsSimulationElement.css";
import { assert, raise } from "../development/Errors";
import { safeCast } from "../type-utils/DynamicTypeChecks";
import { filterByType } from "../data-structures/Arrays";
import { setCssCenter, setCssDiameter, setCssScale } from "./CSSHelpers";

const TAG = "dust-physics-simulation-element";

export class HTMLPhysicsSimulationElement
  extends HTMLElement
  implements Circle, PhysicsSimulationElement
{
  static readonly TAG = TAG; // js is weird ok

  #state: PhysicsSimulationElementState = "pinned";

  static observedAttributes = ["state"];

  attributeChangedCallback(name: string, _: string | null, newValue: string) {
    if (name === "state") {
      assert(newValue === "pinned" || newValue === "free", TAG, newValue, this);
      this.#state = newValue;
    }
  }

  connectedCallback() {
    if (!this.isConnected) {
      return;
    }
  }

  get state(): PhysicsSimulationElementState {
    return this.#state;
  }

  set state(newState: PhysicsSimulationElementState) {
    this.setAttribute("state", newState);
  }

  get centeredWithinParent() {
    return this.classList.contains("centeredWithinParent");
  }

  set centeredWithinParent(newValue: boolean) {
    this.classList.toggle("centeredWithinParent", newValue);
  }

  /**
   * Called on each frame when the simulation is playing.
   */
  simulationFrameCallback?(): void;

  readonly force: Vector2D = [0, 0]; // pixels/millis^2
  velocity: Readonly<Vector2D> = [0, 0]; // pixels/millis

  #center: Readonly<Vector2D> = [0, 0]; // pixels
  #mostRecentCssCenter: Readonly<Vector2D> = [0, 0]; // pixels

  #offsetDiameter: number = 0;
  #localScale = 1.0;

  #mass: number = 100; // TODO

  constructor() {
    super();
    this.classList.add("circle");
    this.offsetDiameter = 100;
    makeDraggableAndZoomable(this);
  }

  get wrappedElement(): HTMLElement {
    // TODO better error handling
    // TODO clean this up
    return safeCast(this.firstElementChild, HTMLElement);
  }

  get center(): Readonly<Vector2D> {
    return this.#center;
  }

  set center(newCenter: Readonly<Vector2D>) {
    assert(isVectorFinite(newCenter), newCenter, this);
    this.#center = newCenter;
    if (!vectorsEqual(this.#mostRecentCssCenter, newCenter)) {
      this.#mostRecentCssCenter = newCenter;
      setCssCenter(this, newCenter);
    }
  }

  get offsetDiameter() {
    return this.#offsetDiameter;
  }

  // NB: if the wrapped element is a circle, its diameter is kept in sync with the wrapper's diameter via a CSS rule; otherwise it's the caller's responsibility to keep its width and height up to date.
  set offsetDiameter(newDiameter: number) {
    if (newDiameter <= 0) {
      throw new RangeError(`Diameter must be positive, got ${newDiameter}`);
    }
    if (newDiameter !== this.#offsetDiameter) {
      this.#offsetDiameter = newDiameter;
      setCssDiameter(this, newDiameter * this.#localScale);
    }
  }

  get diameter() {
    return this.offsetDiameter * this.#localScale;
  }

  get localScale() {
    return this.#localScale;
  }

  // TODO rename this to something like setClientDiameter?
  set localScale(newScale: number) {
    if (newScale <= 0) {
      throw new RangeError(`Scale must be positive, got ${newScale}`);
    }
    if (newScale !== this.#localScale) {
      this.#localScale = newScale;
      setCssScale(this.wrappedElement, newScale);
      setCssDiameter(this, this.#offsetDiameter * newScale);
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
    }
  }

  // connectedCallback() {
  //   if (this.isConnected) {
  //     this.simulationFrameCallback?.();
  //   }
  // }

  getDirectPhysicsElementChildren(): HTMLPhysicsSimulationElement[] {
    return filterByType(
      this.wrappedElement.children,
      HTMLPhysicsSimulationElement,
    );
  }
}
