import { offsetDiameter } from "../math/Geometry";
import type { Circle } from "../math/Geometry";
import { Vector2D, X, Y } from "../math/Vectors";
import { PhysicsElement } from "../math/Physics";
import { PhysicsSimulation } from "./PhysicsSimulation";
import { bubbleElementResizeObserverOptions } from "./BubbleElementResizeObserver";
import { centerWithinParent, setDiameter, setTranslate } from "./HTMLHelpers";

// TODO add another state "focused" which is like "free" but instead of it moving around, the world moves around it so the viewer can keep a fixed reference frame on the element.
export type PhysicsSimulationElementState = "free" | "pinned" | "dragged";

// TODO there are really two kinds of elements:
// Bubbles, which hold a single HTMLElement of any kind, and update their diameter whenever the wrapped value's size changes using a ResizeObserver.
// Collections, which hold multiple other physics elements and have an updateForces() function

export type PhysicsSimulationElementData = (
  | {
      kind: "bubble"; // Holds a single HTMLElement of any kind, and observes it using the simulation's ResizeObserver.
    }
  | {
      kind: "collection"; // Holds a collection of other PhysicsSimulationElements and updates their forces when needed using the given ForceCalculator.
      updateForces: ForceCalculator;
    }
) & { simulation: PhysicsSimulation };

export type ForceCalculator = (
  parentElement: PhysicsSimulationElement,
  childElements: PhysicsSimulationElement[],
) => void;

export type PhysicsSimulationElementProps = Readonly<{
  state: PhysicsSimulationElementState;
  data: Readonly<PhysicsSimulationElementData>;
  center?: Readonly<Vector2D>;
  diameter?: number;
  centeredWithinParent?: boolean;
  mass?: number;
}>;

// TODO instead of debugging resizeobservers and tracking everything manually,
// let's try reimplementing the whole thing in just solidJS:
// - From the ground up, only render DOM elements when they're within the window boundary
// - Use solid's createEffect() to play the simulation as needed
// - On every frame while playing the simulation, go through all the visible elements and collect the PhysicsElements, then:
//    - Reset all forces to zero
//    - Call every element's frame callback
//      - bubbles update their diameters
//      - collections update their diameters and also all of their elements' forces
//    - Update every free element's velocity and position
//    - Call collections' frame callbacks
// Depending on how it goes, we might not even need the custom HTMLElement, e.g. if we can track all the physics data separately using solidJS (e.g. using https://www.solidjs.com/docs/latest#maparray). But if we do, we can use:
// window.getElementsByTagName(PhysicsSimulationElement.TAG) as HTMLCollectionOf<PhysicsSimulationElement>

// BUUUUT still keep this code around in case there's no way to implement it in solidJS efficiently.
export class PhysicsSimulationElement
  extends HTMLElement
  implements Circle, PhysicsElement
{
  static readonly TAG = "dust-physics-simulation-element";
  #attachedToSimulation = false;

  state: PhysicsSimulationElementState = "pinned";
  #data?: Readonly<PhysicsSimulationElementData>;

  readonly force: Vector2D = [0, 0]; // pixels/millis^2
  velocity: Readonly<Vector2D> = [0, 0]; // pixels/millis

  // TODO support relative positions?
  #center: Readonly<Vector2D> = [0, 0];
  #diameter: number = 100;
  #centeredWithinParent: boolean = false;
  readonly #previousCssTranslate: Vector2D = [0, 0]; // pixels, rounded to nearest integers

  // TODO write a setter for this that plays the simulation
  mass: number = 0; // number of characters // TODO should update if the element's expression changes

  initialize(props: Readonly<PhysicsSimulationElementProps>) {
    console.log("PhysicsSimulationElement.init:", this, props);
    const diameter = props.diameter || offsetDiameter(this);
    const center = props.center || [0, 0];
    const centeredWithinParent = props.centeredWithinParent || false;

    this.state = props.state;
    this.#data = props.data;
    this.mass = props.mass || diameter ** 2; // TODO
    this.#diameter = diameter;
    this.#center = center;
    this.#centeredWithinParent = centeredWithinParent;

    setTranslate(this, center, this.#previousCssTranslate);
    setDiameter(this, diameter, centeredWithinParent);

    this.attachToSimulationIfNeeded();

    // TODO if isConnected, add to simulation, otherwise wait for connectedCallback()
  }

  connectedCallback() {
    // TODO check if this runs at the same time as onMount
    console.log(
      "PhysicsSimulationElement connected",
      this.isConnected,
      this.#attachedToSimulation,
    );
    this.attachToSimulationIfNeeded();
  }

  disconnectedCallback() {
    // TODO check if this runs at the same time as onCleanup
    console.log("PhysicsSimulationElement disconnected", this.isConnected);
    this.detachFromSimulationIfNeeded();
  }

  private attachToSimulationIfNeeded() {
    const data = this.#data;
    if (this.#attachedToSimulation || !this.isConnected || data === undefined) {
      return;
    }
    data.simulation.addElement(this);
    this.#attachedToSimulation = true;

    if (data.kind !== "bubble") {
      return;
    }
    if (this.childElementCount !== 1) {
      throw "TODO"; // TODO
    }
    // TODO elements aren't getting unobserved correctly. Do we need to use a MutationObserver?
    data.simulation.bubbleElementResizeObserver.observe(
      this.firstElementChild!,
      bubbleElementResizeObserverOptions,
    );
  }

  private detachFromSimulationIfNeeded() {
    if (!this.#attachedToSimulation) {
      return;
    }
    const data = this.#data!;
    data.simulation.removeElement(this);
    this.#attachedToSimulation = false;

    if (data.kind !== "bubble") {
      return;
    }
    data.simulation.bubbleElementResizeObserver.unobserve(
      this.firstElementChild!,
    );
  }

  private playSimulation() {
    this.#data!.simulation.playing = true;
  }

  get center() {
    return this.#center;
  }

  set center(newCenter: Readonly<Vector2D>) {
    this.#center = newCenter;
    setTranslate(this, newCenter, this.#previousCssTranslate);
    this.playSimulation();
  }

  get diameter() {
    return this.#diameter;
  }

  // TODO instead of setting the diameter based on the htmlElement's size, maybe set the padding instead?
  set diameter(newDiameter: number) {
    this.#diameter = newDiameter;
    setDiameter(this, newDiameter, this.#centeredWithinParent);
    this.playSimulation();
  }

  setBoundary(boundary: Circle) {
    this.center = boundary.center;
    this.diameter = boundary.diameter;
  }

  get centeredWithinParent() {
    return this.#centeredWithinParent;
  }

  set centeredWithinParent(newValue: boolean) {
    this.#centeredWithinParent = newValue;
    if (newValue) {
      centerWithinParent(this, this.#diameter);
      this.playSimulation();
    }
  }

  updateForces() {
    const data = this.#data!;
    if (data.kind === "collection") {
      data.updateForces(this, getPhysicsSimulationElementChildren(this));
    }
  }
}

function getPhysicsSimulationElementChildren(
  element: PhysicsSimulationElement,
): PhysicsSimulationElement[] {
  const result: PhysicsSimulationElement[] = [];
  for (const child of element.children) {
    if (child instanceof PhysicsSimulationElement) {
      result.push(child);
    }
  }
  return result;
}
