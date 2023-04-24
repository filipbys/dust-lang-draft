import { roundToString } from "./Numbers";

export type Vector2D = {
  x: number;
  y: number;
};

export function vectorToString(
  vector: Readonly<Vector2D>,
  fractionDigits: number = 0
): string {
  return (
    roundToString(vector.x, fractionDigits) +
    "," +
    roundToString(vector.y, fractionDigits)
  );
}

export function lengthSquared(vector: Readonly<Vector2D>): number {
  return vector.x ** 2 + vector.y ** 2;
}

export function length(vector: Readonly<Vector2D>): number {
  return Math.hypot(vector.x, vector.y);
}

export function distanceBetween(
  first: Readonly<Vector2D>,
  second: Readonly<Vector2D>
): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function scale(
  vector: Readonly<Vector2D>,
  hypotenuse: number
): Vector2D {
  const currentHypotenuse = length(vector);
  if (currentHypotenuse === 0) {
    return structuredClone(vector);
  }
  const ratio = hypotenuse / currentHypotenuse;
  return {
    x: vector.x * ratio,
    y: vector.y * ratio,
  };
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
