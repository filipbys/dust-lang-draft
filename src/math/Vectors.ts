import { roundToString } from "./Numbers";

export type Vector2DIndex = 0 | 1;
export const X: Vector2DIndex = 0;
export const Y: Vector2DIndex = 1;

export type Vector2D = [x: number, y: number];

export function vectorsEqual(
  first: Readonly<Vector2D>,
  second: Readonly<Vector2D>
): boolean {
  return first[X] === second[X] && first[Y] === second[Y];
}

export function rounded(vector: Readonly<Vector2D>): Vector2D {
  return [Math.round(vector[X]), Math.round(vector[Y])];
}

export function vectorToString(
  [x, y]: Readonly<Vector2D>,
  fractionDigits: number = 0
): string {
  return (
    roundToString(x, fractionDigits) + "," + roundToString(y, fractionDigits)
  );
}

export function lengthSquared([x, y]: Readonly<Vector2D>): number {
  return x ** 2 + y ** 2;
}

export function length([x, y]: Readonly<Vector2D>): number {
  return Math.hypot(x, y);
}

export function distanceBetween(
  first: Readonly<Vector2D>,
  second: Readonly<Vector2D>
): number {
  return Math.hypot(second[X] - first[X], second[Y] - first[Y]);
}

// TODO verify that this works
export function scale(
  vector: Readonly<Vector2D>,
  hypotenuse: number
): Vector2D {
  const currentHypotenuse = length(vector);
  if (currentHypotenuse === 0) {
    return [0, 0];
  }
  const ratio = hypotenuse / currentHypotenuse;
  return [vector[X] * ratio, vector[Y] * ratio];
}

// TODO remove
function getScaled(
  hypotenuse: number,
  mainDirection: number,
  otherDirection: number
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
