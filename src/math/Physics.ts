import { gapBetween } from "./Geometry";
import { clamp } from "./Numbers";
import { distanceBetween, Vector2D, scale } from "./Vectors";

export interface PhysicsElement {
  center: Readonly<Vector2D>;
  readonly diameter: number;

  readonly force: Vector2D;
  readonly velocity: Vector2D;

  readonly mass: number;
}

export interface PhysicsConstants {
  readonly dragMultiplier: number;
  readonly frictionCoefficient: number;
}

// positive force => speed up along that direction, negative force => accellerate in the opposite direction
export function addForceAlong(
  element: PhysicsElement,
  direction: Vector2D,
  force: number
) {
  const forceVector = scale(direction, force);

  element.force.x += forceVector.x;
  element.force.y += forceVector.y;
}

// positive force => attract, negative force => repel
export function addForceBetween(
  first: PhysicsElement,
  second: PhysicsElement,
  force: number
) {
  const direction = {
    x: second.center.x - first.center.x,
    y: second.center.y - first.center.y,
  };
  const forceVector = scale(direction, force);

  first.force.x += forceVector.x;
  first.force.y += forceVector.y;

  second.force.x -= forceVector.x;
  second.force.y -= forceVector.y;
}

const MAX_VELOCITY_MAGNITUDE = 2; // pixels/millis

function newVelocity(
  currentVelocity: number,
  force: number,
  mass: number,
  constants: PhysicsConstants,
  deltaMillis: number
): number {
  // force: pixels*mass/millis^2
  // accelleration: pixels/millis^2
  const accelleration = force / mass; // (F = ma) => (a = F / m)

  // velocity: pixels/millis
  let newVelocity =
    (currentVelocity + accelleration * deltaMillis) *
    constants.dragMultiplier ** deltaMillis;

  newVelocity -=
    Math.sign(newVelocity) *
    Math.min(constants.frictionCoefficient, Math.abs(newVelocity));

  // TODO this allows elements to move faster diagonally than they can ever move horizontally or vertically. Need to limit the actual distance travelled.
  return clamp(-MAX_VELOCITY_MAGNITUDE, newVelocity, MAX_VELOCITY_MAGNITUDE);
}

export function updateVelocityAndPosition(
  element: PhysicsElement,
  constants: PhysicsConstants,
  deltaMillis: number
) {
  element.velocity.x = newVelocity(
    element.velocity.x,
    element.force.x,
    element.mass,
    constants,
    deltaMillis
  );
  element.velocity.y = newVelocity(
    element.velocity.y,
    element.force.y,
    element.mass,
    constants,
    deltaMillis
  );

  element.center = {
    x: element.center.x + element.velocity.x * deltaMillis,
    y: element.center.y + element.velocity.y * deltaMillis,
  };
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
