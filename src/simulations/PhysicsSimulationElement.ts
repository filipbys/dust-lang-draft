import { elementDiameter } from "../math/Geometry";
import type { Circle } from "../math/Geometry";
import { Vector2D, X, Y } from "../math/Vectors";
import { PhysicsElement } from "../math/Physics";
import { PhysicsSimulation } from "./PhysicsSimulation";
import { bubbleElementResizeObserverOptions } from "./BubbleElementResizeObserver";

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
  childElements: PhysicsSimulationElement[]
) => void;

export type PhysicsSimulationElementProps = Readonly<{
  state: PhysicsSimulationElementState;
  data: Readonly<PhysicsSimulationElementData>;
  center?: Readonly<Vector2D>;
  diameter?: number;
  centeredWithinParent?: boolean;
  mass?: number;
}>;

export class PhysicsSimulationElement
  extends HTMLDivElement
  implements Circle, PhysicsElement
{
  static readonly TAG = "dust-physics-simulation-element";

  state: PhysicsSimulationElementState;
  readonly #data: Readonly<PhysicsSimulationElementData>;

  readonly force: Vector2D = [0, 0]; // pixels/millis^2
  velocity: Readonly<Vector2D> = [0, 0]; // pixels/millis

  // TODO support relative positions?
  #center: Readonly<Vector2D>;
  #diameter: number;
  #centeredWithinParent: boolean;
  readonly #previousCssTranslate: Vector2D = [0, 0]; // pixels, rounded to nearest integers

  // TODO write a setter for this that plays the simulation
  mass: number; // number of characters // TODO should update if the element's expression changes

  constructor(props: Readonly<PhysicsSimulationElementProps>) {
    super();
    const diameter = props.diameter || elementDiameter(this); // TODO should run in connectedCallback()
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
  }

  connectedCallback() {
    // TODO check if this runs at the same time as onMount
    console.log("PhysicsSimulationElement connected", this.isConnected);
    if (!this.isConnected) {
      // must check isConnected: https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements
      return;
    }
    this.#data.simulation.addElement(this);
    if (this.#data.kind === "bubble") {
      if (this.childElementCount !== 1) {
        throw "TODO"; // TODO
      }
      this.#data.simulation.bubbleElementResizeObserver.observe(
        this.firstElementChild!,
        bubbleElementResizeObserverOptions
      );
    }
  }

  disconnectedCallback() {
    // TODO check if this runs at the same time as onCleanup
    console.log("PhysicsSimulationElement disconnected", this.isConnected);
    // TODO figure out if should check isConnected and how: is it supposed to be false by now?
    this.#data.simulation.removeElement(this);
    if (this.#data.kind === "bubble") {
      this.#data.simulation.bubbleElementResizeObserver.unobserve(
        this.firstElementChild!
      );
    }
  }

  get center() {
    return this.#center;
  }

  set center(newCenter: Readonly<Vector2D>) {
    this.#center = newCenter;
    setTranslate(this, newCenter, this.#previousCssTranslate);
    this.#data.simulation.playing = true;
  }

  get diameter() {
    return this.#diameter;
  }

  // TODO instead of setting the diameter based on the htmlElement's size, maybe set the padding instead?
  set diameter(newDiameter: number) {
    this.#diameter = newDiameter;
    setDiameter(this, newDiameter, this.#centeredWithinParent);
    this.#data.simulation.playing = true;
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
      this.#data.simulation.playing = true;
    }
  }

  updateForces() {
    if (this.#data.kind === "collection") {
      this.#data.updateForces(this, getPhysicsSimulationElementChildren(this));
    }
  }
}

function getPhysicsSimulationElementChildren(
  element: PhysicsSimulationElement
): PhysicsSimulationElement[] {
  const result: PhysicsSimulationElement[] = [];
  for (const child of element.children) {
    if (child instanceof PhysicsSimulationElement) {
      result.push(child);
    }
  }
  return result;
}

// TODO move these into a separate file
function setTranslate(
  htmlElement: HTMLElement,
  newTranslate: Readonly<Vector2D>,
  previousTranslate: Vector2D
) {
  const x = Math.round(newTranslate[X]);
  const y = Math.round(newTranslate[Y]);
  // TODO observe jank and measure perf with/without this optimization
  if (x === previousTranslate[X] && y === previousTranslate[Y]) {
    return;
  }

  // TODO try using custom css properties:
  // - js: style.setPropery("--translate-x", x + "px")
  //       style.setPropery("--translate-y", y + "px")
  // - css: transform: translate(var(--translate-x), var(--translate-y))
  // see https://thomaswilburn.github.io/wc-book/sd-behavioral.html
  htmlElement.style.transform = `translate(${x}px, ${y}px)`;
  previousTranslate[X] = x;
  previousTranslate[Y] = y;
}

function setDiameter(
  htmlElement: HTMLElement,
  newDiameter: number,
  centeredWithinParent: boolean
) {
  // TODO try custom css properties for this as well (see above)
  const roundedDiameter = Math.round(newDiameter);
  const style = htmlElement.style;
  style.width = roundedDiameter + "px";
  style.height = roundedDiameter + "px";
  style.borderRadius = roundedDiameter + "px"; // just needs to be bigger than the element's radius

  if (centeredWithinParent) {
    centerWithinParent(htmlElement, newDiameter);
  }
}

function centerWithinParent(htmlElement: HTMLElement, diameter: number) {
  // Center the element on its parent (movement within parent uses css transform: translate)
  const roundedRadius = Math.round(diameter / 2);
  const style = htmlElement.style;
  style.left = `calc(50% - ${roundedRadius}px)`;
  style.top = `calc(50% - ${roundedRadius}px)`;
}
