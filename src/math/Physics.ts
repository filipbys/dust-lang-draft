import { assert } from "../development/Errors";
import { gapBetween } from "./Geometry";
import { clamp } from "./Numbers";
import {
  distanceBetween,
  Vector2D,
  scale,
  vectorLength,
  Vector2DIndex,
  X,
  Y,
  vectorLengthSquared,
  vectorBetween,
  isVectorFinite,
} from "./Vectors";

// TODO consider switching to different units like mm instead of px
export interface PhysicsElement {
  readonly diameter: number; // pixels
  center: Readonly<Vector2D>; // pixels
  velocity: Readonly<Vector2D>; // pixels/millis.
  readonly force: Vector2D; // characters * pixels/(millis^2). Mutable since it changes the most often per frame
  readonly mass: number; // characters
}

export function kineticEnergy(element: Readonly<PhysicsElement>): number {
  return (element.mass * vectorLengthSquared(element.velocity)) / 2;
}

export interface PhysicsConstants {
  readonly maxVelocity: number; // pixels/millis: no elements can move faster than this

  readonly dragMultiplier: number; // a fraction between zero and 1: reduces current velocity proportionally to the current velocity. Faster elements slow down quicker.
  readonly frictionCoefficient: number; // pixels/millis: reduces current velocity by at most this amount. Slow elements just stop moving.
}

// positive force => speed up along that direction, negative force => accellerate in the opposite direction
export function addForceAlong(
  element: Readonly<PhysicsElement>,
  direction: Vector2D,
  force: number,
) {
  const forceVector = scale(direction, force);

  element.force[X] += forceVector[X];
  element.force[Y] += forceVector[Y];
}

/**
 * positive force => repel, negative force => attract
 */
export function addForceBetween(
  first: Readonly<PhysicsElement>,
  second: Readonly<PhysicsElement>,
  force: number,
) {
  const direction: Vector2D = vectorBetween(first.center, second.center);
  const forceVector = scale(direction, force);

  first.force[X] += forceVector[X];
  first.force[Y] += forceVector[Y];

  second.force[X] -= forceVector[X];
  second.force[Y] -= forceVector[Y];
}

export function updateVelocityAndPosition(
  element: PhysicsElement,
  constants: PhysicsConstants,
  deltaMillis: number,
) {
  assert(deltaMillis > 0);
  const frictionlessVelocity: Vector2D = [
    newVelocityInDimension(element, X, constants, deltaMillis),
    newVelocityInDimension(element, Y, constants, deltaMillis),
  ];

  const newVelocityMagnitude =
    vectorLength(frictionlessVelocity) - constants.frictionCoefficient;

  element.velocity = scale(
    frictionlessVelocity,
    clamp(0, newVelocityMagnitude, constants.maxVelocity),
  );

  element.center = [
    element.center[X] + element.velocity[X] * deltaMillis,
    element.center[Y] + element.velocity[Y] * deltaMillis,
  ];
}

function newVelocityInDimension(
  element: Readonly<PhysicsElement>,
  dimension: Vector2DIndex,
  constants: PhysicsConstants,
  deltaMillis: number,
): number {
  assert(isVectorFinite(element.velocity), element.velocity);
  assert(isVectorFinite(element.force), element.force);
  assert(isVectorFinite(element.center), element.center);

  // force: pixels*mass/millis^2
  // accelleration: pixels/millis^2
  const accelleration = element.force[dimension] / element.mass; // (F = ma) => (a = F / m)

  assert(isFinite(accelleration));
  // velocity: pixels/millis
  const newVelocity =
    (element.velocity[dimension] + accelleration * deltaMillis) *
    constants.dragMultiplier ** deltaMillis;

  assert(isFinite(newVelocity));
  return newVelocity;
}

export namespace Springs {
  // springConstant: force/pixel = pixel/millis^2 / pixel = 1/millis^2
  function springForce(
    springConstant: number,
    idealLength: number,
    actualLength: number,
  ): number {
    return (actualLength - idealLength) * springConstant;
  }

  export function connectCenters(
    first: Readonly<PhysicsElement>,
    second: Readonly<PhysicsElement>,
    springConstant: number,
    idealDistance: number,
  ): number {
    const actualDistance = distanceBetween(first.center, second.center);
    addForceBetween(
      first,
      second,
      springForce(springConstant, idealDistance, actualDistance),
    );
    return actualDistance;
  }

  export function connectBorders(
    first: Readonly<PhysicsElement>,
    second: Readonly<PhysicsElement>,
    springConstant: number,
    idealGap: number,
  ): number {
    const actualGap = gapBetween(first, second);
    addForceBetween(
      first,
      second,
      springForce(springConstant, idealGap, actualGap),
    );
    return actualGap;
  }

  export function preventCollisions(
    first: Readonly<PhysicsElement>,
    second: Readonly<PhysicsElement>,
    springConstant: number,
    idealMinimumGap: number = 0,
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
        springForce(springConstant / 2, idealMinimumGap, actualGap),
      );
    }
    return actualGap;
  }

  export function keepWithin(
    inner: Readonly<PhysicsElement>,
    outer: Readonly<PhysicsElement>,
    springConstant: number,
    idealMinimumGapToOuter: number,
  ): number {
    const idealGap = -(inner.diameter + idealMinimumGapToOuter);
    const actualGap = gapBetween(inner, outer);
    if (actualGap > idealGap) {
      addForceBetween(
        inner,
        outer,
        springForce(springConstant, idealGap, actualGap),
      );
    }
    return actualGap;
  }
}
