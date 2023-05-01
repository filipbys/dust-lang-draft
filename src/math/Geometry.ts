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

export function elementDiameter(element: HTMLElement) {
  return Math.hypot(element.offsetWidth, element.offsetHeight);
}

export function rectangleDiameter(rectangle: Rectangle): number {
  return Math.hypot(rectangle.width, rectangle.height);
}

export function approximateSmallestEnclosingCircle(
  circles: readonly Circle[],
): Circle {
  let [min_x, min_y, max_x, max_y] = [0, 0, 0, 0];
  for (const circle of circles) {
    const [x, y] = circle.center;
    min_x = Math.min(min_x, x);
    min_y = Math.min(min_y, y);

    max_x = Math.max(max_x, x);
    max_y = Math.max(max_y, y);
  }

  const center: Vector2D = [(min_x + max_x) / 2, (min_y + max_y) / 2];

  let min_radius = 1;
  for (const circle of circles) {
    const radius = circle.diameter / 2;
    min_radius = Math.max(
      min_radius,
      distanceBetween(center, circle.center) + radius,
    );
  }

  return {
    center,
    diameter: min_radius * 2,
  };
}
