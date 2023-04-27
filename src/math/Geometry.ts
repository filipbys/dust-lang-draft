import type { Vector2D } from "./Vectors";
import { distanceBetween } from "./Vectors";

export interface Circle {
  readonly center: Readonly<Vector2D>;
  readonly diameter: number;
}

export interface Rectangle {
  width: number;
  height: number;
}

// Positive => circles are not touching
// Zero     => circle borders are touching
// Negative => circles overlap
export function gapBetween(first: Circle, second: Circle): number {
  const sumOfRadii = (first.diameter + second.diameter) / 2;
  return distanceBetween(first.center, second.center) - sumOfRadii;
}

export function elementDiameter(element: Element) {
  return rectangleDiameter(element.getBoundingClientRect());
}

export function rectangleDiameter(rectangle: Rectangle): number {
  return Math.hypot(rectangle.width, rectangle.height);
}

export function smallestEnclosingCircle(circles: readonly Circle[]): Circle {
  return {
    center: [0, 0], // TODO
    diameter: 700, // TODO
  };
}
