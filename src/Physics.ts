import { clamp } from "./Numbers";
import { elementDiameter, gapBetween } from "./math/Geometry";
import type { Circle } from "./math/Geometry";
import type { Vector2D } from "./math/Vectors";
import { distanceBetween, getScaled, lengthSquared } from "./math/Vectors";

// TODO! decouple HTML part from the math part. Math part belongs in the math/ folder.

const MAX_VELOCITY_MAGNITUDE = 2; // pixels/millis

// TODO add another state "focused" which is like "free" but instead of it moving around, the world moves around it so the viewer can keep a fixed reference frame on the element.
export type PhysicsState = "free" | "pinned" | "dragged";

// TODO implement to/from JSON
export class PhysicsElement implements Circle {
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

  get kineticEnergy(): number {
    return (this.mass * lengthSquared(this.velocity)) / 2;
  }

  // dragMultiplier: a fraction between zero and 1
  // frictionCoefficient: pixels/millis
  updateVelocityAndPositionIfNeeded(
    dragMultiplier: number,
    frictionCoefficient: number,
    deltaMillis: number
  ) {
    if (this.state !== "free") {
      return;
    }
    const mass = Math.max(this.mass, 1);
    const velocity = this.velocity;

    velocity.x = newVelocity(
      velocity.x,
      this.force.x,
      mass,
      dragMultiplier,
      frictionCoefficient,
      deltaMillis
    );
    velocity.y = newVelocity(
      velocity.y,
      this.force.y,
      mass,
      dragMultiplier,
      frictionCoefficient,
      deltaMillis
    );

    this.center = {
      x: this.center.x + velocity.x * deltaMillis,
      y: this.center.y + velocity.y * deltaMillis,
    };
  }
}

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

function newVelocity(
  currentVelocity: number,
  force: number,
  mass: number,
  dragMultiplier: number,
  frictionCoefficient: number,
  deltaMillis: number
): number {
  // force: pixels*mass/millis^2
  // accelleration: pixels/millis^2
  const accelleration = force / mass; // (F = ma) => (a = F / m)

  // velocity: pixels/millis
  let newVelocity =
    (currentVelocity + accelleration * deltaMillis) *
    dragMultiplier ** deltaMillis;

  newVelocity -=
    Math.sign(newVelocity) *
    Math.min(frictionCoefficient, Math.abs(newVelocity));

  return clamp(-MAX_VELOCITY_MAGNITUDE, newVelocity, MAX_VELOCITY_MAGNITUDE);
}

// positive force => speed up along that direction, negative force => accellerate in the opposite direction
export function addForceAlong(
  element: PhysicsElement,
  direction: Vector2D,
  force: number
) {
  const force_x = getScaled(force, direction.x, direction.y);
  const force_y = getScaled(force, direction.y, direction.x);

  element.force.x += force_x;
  element.force.y += force_y;
}

// positive force => attract, negative force => repel
export function addForceBetween(
  first: PhysicsElement,
  second: PhysicsElement,
  force: number
) {
  const direction_x = second.center.x - first.center.x;
  const direction_y = second.center.y - first.center.y;

  const force_x = getScaled(force, direction_x, direction_y);
  const force_y = getScaled(force, direction_y, direction_x);

  first.force.x += force_x;
  first.force.y += force_y;

  second.force.x -= force_x;
  second.force.y -= force_y;
}

export namespace Springs {
  // springConstant: force/pixel = pixel/millis^2 / pixel = 1/millis^2
  function springForce(
    springConstant: number,
    idealLength: number,
    actualLength: number
  ): number {
    return (actualLength - idealLength) * springConstant;
  }

  export function connectCenters(
    first: PhysicsElement,
    second: PhysicsElement,
    springConstant: number,
    idealDistance: number
  ): number {
    const actualDistance = distanceBetween(first.center, second.center);
    addForceBetween(
      first,
      second,
      springForce(springConstant, idealDistance, actualDistance)
    );
    return actualDistance;
  }

  export function connectBorders(
    first: PhysicsElement,
    second: PhysicsElement,
    springConstant: number,
    idealGap: number
  ): number {
    const actualGap = gapBetween(first, second);
    addForceBetween(
      first,
      second,
      springForce(springConstant, idealGap, actualGap)
    );
    return actualGap;
  }

  export function preventCollisions(
    first: PhysicsElement,
    second: PhysicsElement,
    springConstant: number,
    idealMinimumGap: number = 0
  ): number {
    const actualGap = gapBetween(first, second);
    if (actualGap < 0) {
      // TODO this will break down for heavy elements
      addForceBetween(first, second, springForce(springConstant, 0, actualGap));
    }
    if (actualGap < idealMinimumGap) {
      addForceBetween(
        first,
        second,
        springForce(springConstant / 2, idealMinimumGap, actualGap)
      );
    }
    return actualGap;
  }

  export function keepWithin(
    inner: PhysicsElement,
    outer: PhysicsElement,
    springConstant: number,
    idealMinimumGapToOuter: number
  ): number {
    const idealGap = -(inner.diameter + idealMinimumGapToOuter);
    const actualGap = gapBetween(inner, outer);
    if (actualGap > idealGap) {
      addForceBetween(
        inner,
        outer,
        springForce(springConstant, idealGap, actualGap)
      );
    }
    return actualGap;
  }
}
