import { roundToString } from "./Numbers";

export type Vector2D = {
  x: number;
  y: number;
};

export function vectorToString(
  vector: Vector2D,
  fractionDigits: number = 0
): string {
  return (
    roundToString(vector.x, fractionDigits) +
    "," +
    roundToString(vector.y, fractionDigits)
  );
}

export function lengthSquared(vector: Vector2D): number {
  return vector.x ** 2 + vector.y ** 2;
}

export function distanceBetween(first: Vector2D, second: Vector2D): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function getScaled(
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
