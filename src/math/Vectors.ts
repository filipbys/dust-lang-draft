import { approximatelyEqual, roundToString } from "./Numbers";

export type Vector2DIndex = 0 | 1;
export const X: Vector2DIndex = 0;
export const Y: Vector2DIndex = 1;

export type Vector2D = [x: number, y: number];

export function isVectorFinite(vector: Readonly<Vector2D>): boolean {
  return isFinite(vector[X]) && isFinite(vector[Y]);
}

export function vectorsEqual(
  first: Readonly<Vector2D>,
  second: Readonly<Vector2D>,
): boolean {
  return first[X] === second[X] && first[Y] === second[Y];
}

export function vectorsApproximatelyEqual(
  first: Readonly<Vector2D>,
  second: Readonly<Vector2D>,
  tolerance: number,
): boolean {
  return (
    approximatelyEqual(first[X], second[X], tolerance) &&
    approximatelyEqual(first[Y], second[Y], tolerance) &&
    approximatelyEqual(vectorLength(first), vectorLength(second), tolerance)
  );
}

export function rounded(vector: Readonly<Vector2D>): Vector2D {
  return [Math.round(vector[X]), Math.round(vector[Y])];
}

export function vectorToString(
  [x, y]: Readonly<Vector2D>,
  fractionDigits: number = 0,
): string {
  return (
    roundToString(x, fractionDigits) + "," + roundToString(y, fractionDigits)
  );
}

export function vectorLengthSquared([x, y]: Readonly<Vector2D>): number {
  return x ** 2 + y ** 2;
}

export function vectorLength([x, y]: Readonly<Vector2D>): number {
  return Math.hypot(x, y);
}

export function distanceBetween(
  first: Readonly<Vector2D>,
  second: Readonly<Vector2D>,
): number {
  return Math.hypot(second[X] - first[X], second[Y] - first[Y]);
}

export function vectorBetween(
  first: Readonly<Vector2D>,
  second: Readonly<Vector2D>,
): Vector2D {
  return [second[X] - first[X], second[Y] - first[Y]];
}

export function vectorAverage(
  first: Readonly<Vector2D>,
  second: Readonly<Vector2D>,
): Vector2D {
  return [(first[X] + second[X]) / 2, (first[Y] + second[Y]) / 2];
}

export function vectorTimes(
  vector: Readonly<Vector2D>,
  multiplier: number,
): Vector2D {
  return [vector[X] * multiplier, vector[Y] * multiplier];
}

// TODO verify that this works
export function scale(vector: Readonly<Vector2D>, newLength: number): Vector2D {
  const currentLength = vectorLength(vector);
  if (currentLength === 0) {
    return [0, 0];
  }
  return vectorTimes(vector, newLength / currentLength);
}

// TODO remove
function getScaled(
  hypotenuse: number,
  mainDirection: number,
  otherDirection: number,
) {
  if (mainDirection === 0) {
    return 0;
  }
  // quadratic formula:
  // a^2 + b^2 = hypotenuse^2
  // b/a = otherDirection/mainDirection
  // Trying to find a:
  // b = a * otherDirection/mainDirection
  // b^2 = a^2 * (otherDirection/mainDirection)^2
  // a^2 + (a^2 * (otherDirection/mainDirection)^2) = hypotenuse^2
  // a^2 * ((otherDirection/mainDirection)^2 + 1) = hypotenuse^2
  // a^2 = hypotenuse^2 / ((otherDirection/mainDirection)^2 + 1)
  // a = ± hypotenuse / sqrt((otherDirection/mainDirection)^2 + 1)

  // TODO check if just hypotenuse * mainDirection / otherDirection works? And measure if that's faster
  const ratio = otherDirection / mainDirection;
  return (Math.sign(mainDirection) * hypotenuse) / Math.sqrt(ratio ** 2 + 1);
}
