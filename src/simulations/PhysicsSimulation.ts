import { elementDiameter, gapBetween } from "../math/Geometry";
import type { Circle } from "../math/Geometry";
import type { Vector2D } from "../math/Vectors";
import { lengthSquared } from "../math/Vectors";
import {
  PhysicsConstants,
  PhysicsElement,
  updateVelocityAndPosition,
} from "../math/Physics";

// TODO! decouple HTML part from the math part. Math part belongs in the math/ folder.

// TODO add another state "focused" which is like "free" but instead of it moving around, the world moves around it so the viewer can keep a fixed reference frame on the element.
// export type PhysicsState = "free" | "pinned" | "dragged";

// TODO implement to/from JSON
// TODO tie in DragAndDrop
export class PhysicsSimulationElement implements Circle, PhysicsElement {
  readonly htmlElement: HTMLElement;
  state: PhysicsState;
  readonly force: Vector2D = { x: 0, y: 0 }; // pixels/millis^2
  readonly velocity: Vector2D = { x: 0, y: 0 }; // pixels/millis

  // TODO support relative positions?
  #center: Readonly<Vector2D>; // pixels. Vector is Readonly so we can make sure we update html position when it changes
  #diameter: number;
  #centeredWithinParent: boolean;
  readonly #previousCssTranslate: Vector2D = { x: 0, y: 0 }; // pixels, rounded to nearest integers
  mass: number; // number of characters // TODO should update if the element's expression changes

  constructor({
    htmlElement,
    state,
    center = { x: 0, y: 0 },
    diameter = elementDiameter(htmlElement),
    centeredWithinParent = false,
    mass = diameter ** 2, // TODO
  }: Readonly<{
    htmlElement: HTMLElement;
    state: PhysicsState;
    center?: Readonly<Vector2D>;
    diameter?: number;
    centeredWithinParent?: boolean;
    mass?: number;
  }>) {
    this.htmlElement = htmlElement;
    this.state = state;
    this.mass = mass;
    this.#diameter = diameter;
    this.#center = center;
    this.#centeredWithinParent = centeredWithinParent;

    setTranslate(htmlElement, center, this.#previousCssTranslate);
    setDiameter(htmlElement, diameter, centeredWithinParent);
  }

  get center() {
    return this.#center;
  }

  set center(newCenter: Readonly<Vector2D>) {
    this.#center = newCenter;
    setTranslate(this.htmlElement, newCenter, this.#previousCssTranslate);
  }

  get diameter() {
    return this.#diameter;
  }

  // TODO instead of setting the diameter based on the htmlElement's size, maybe set the padding instead?
  set diameter(newDiameter: number) {
    this.#diameter = newDiameter;
    setDiameter(this.htmlElement, newDiameter, this.#centeredWithinParent);
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
      centerWithinParent(this.htmlElement, this.#diameter);
    }
  }
}

// TODO move these into a separate file
function setTranslate(
  htmlElement: HTMLElement,
  newTranslate: Readonly<Vector2D>,
  previousTranslate: Vector2D
) {
  const x = Math.round(newTranslate.x);
  const y = Math.round(newTranslate.y);
  // TODO observe jank and measure perf with/without this optimization
  if (x === previousTranslate.x && y === previousTranslate.y) {
    return;
  }

  // TODO try using custom css properties:
  // - js: style.setPropery("--translate-x", x + "px")
  //       style.setPropery("--translate-y", y + "px")
  // - css: transform: translate(var(--translate-x), var(--translate-y))
  // see https://thomaswilburn.github.io/wc-book/sd-behavioral.html
  htmlElement.style.transform = `translate(${x}px, ${y}px)`;
  previousTranslate.x = x;
  previousTranslate.y = y;
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
