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

import "./HTMLPhysicsSimulationElement.css";
import { assert, raise } from "../development/Errors";
import { safeCast } from "../type-utils/DynamicTypeChecks";
import { filterByType } from "../data-structures/Arrays";
import { makeDraggableAndZoomable } from "../drag-zoom-drop/DragZoomAndDropV2";

export class HTMLPhysicsSimulationElement
  extends HTMLElement
  implements Circle, PhysicsSimulationElement
{
  static readonly TAG = "dust-physics-simulation-element";

  // TODO set the state as a css class or attribute
  // TODO should also play the simulation when set, right?
  state: PhysicsSimulationElementState = "pinned";

  /**
   * Called on each frame when the simulation is playing.
   */
  simulationFrameCallback?(): void;

  /**
   * Called when something in the element changes and the simulation needs to be played.
   */
  // TODO instead of having a global simulation that always simulates all elements, keep track of which subtree(s) of the simulation are actually active.
  // One way to do this would be to add a custom HTMLPhysicsSimulationContainer element that stores the simulation state. To play the simulation, an element finds the closest HTMLPhysicsSimulationElement ancestor and asks it to start simulating. That ancestor asks its ancestor to start simulating, and so forth until we reach the root. Then on each frame, the root simulates only the parts of the tree that requested a simulation frame. Each element also keeps a #simulationFrameRequested flag so it doesn't request the simulation more than once per frame: it sets the flag to true when requesting a simulation frame, and sets it to false when its simulationFrameCallback is triggered.
  // Another way would be to have a queue of HTMLPhysicsSimulationElements that have requested a simulation frame: each element adds itself to the queue, and then on the next frame, the global simulation drains the queue, calling the simulationFrameCallbacks for all the elements. That way, similar to requestAnimationFrame(), each element has to re-add itself in its simulationFrameCallback if it wants to keep simulating.
  // NOTE! keep in mind that when something changes about an HTMLPhysicsSimulationElement, we need to play its *parent's* simulation
  playPhysicsSimulation?(): void;

  readonly force: Vector2D = [0, 0]; // pixels/millis^2
  velocity: Readonly<Vector2D> = [0, 0]; // pixels/millis

  #center: Readonly<Vector2D> = [0, 0];
  #previousCssTranslate: Readonly<Vector2D> = [0, 0]; // pixels, rounded to nearest integers

  #offsetDiameter: number = 0;
  #localScale = 1.0;
  #previousCssDiameter: number = 0; // pixels, rounded to nearest integer: #offsetDiameter * #localScale

  #mass: number = 100; // TODO

  constructor() {
    super();
    this.classList.add("circle");
    this.offsetDiameter = 100;
    makeDraggableAndZoomable(this, {
      properties: this,
      positionMarkerDiameter: "40px",
    });
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
    if (!vectorsEqual(this.#previousCssTranslate, newCenter)) {
      if (distanceBetween(this.#previousCssTranslate, newCenter) >= 1000) {
        console.trace(
          "Element moved suspiciously fast", // TODO resolve and remove this: it can happen when dragging while zoomed out
          this.#previousCssTranslate,
          newCenter,
          this,
        );
      }
      this.#previousCssTranslate = newCenter;
      // TODO extract this kind of thing into a helper module so we can share it
      this.style.setProperty("--center-x", newCenter[X] + "px");
      this.style.setProperty("--center-y", newCenter[Y] + "px");
      this.playPhysicsSimulation?.();
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
      this.#setCssDiameter(newDiameter * this.#localScale);
    }
  }

  get diameter() {
    return this.offsetDiameter * this.#localScale;
  }

  #setCssDiameter(newDiameter: number) {
    if (this.#previousCssDiameter !== newDiameter) {
      this.#previousCssDiameter = newDiameter;
      this.style.setProperty("--diameter", newDiameter + "px");
      this.playPhysicsSimulation?.();
    }
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
      // TODO update CSS to match
      this.wrappedElement.style.setProperty("--scale", newScale.toString());
      this.#setCssDiameter(this.#offsetDiameter * newScale);
    }
  }

  get centeredWithinParent() {
    return this.classList.contains("centeredWithinParent");
  }

  set centeredWithinParent(newValue: boolean) {
    if (this.centeredWithinParent !== newValue) {
      this.classList.toggle("centeredWithinParent", newValue);
      this.playPhysicsSimulation?.();
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
      this.playPhysicsSimulation?.();
    }
  }

  connectedCallback() {
    if (this.isConnected) {
      this.simulationFrameCallback?.();
    }
  }

  getDirectPhysicsElementChildren(): HTMLPhysicsSimulationElement[] {
    return filterByType(
      this.wrappedElement.children,
      HTMLPhysicsSimulationElement,
    );
  }
}
