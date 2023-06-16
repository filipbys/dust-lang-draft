import { Vector2D } from "../math/Vectors";

export function getPointerPosition(event: MouseEvent): Vector2D {
  return [event.clientX, event.clientY];
}

export function getPointerPercentageOffset(
  element: Element,
  event: MouseEvent,
): Vector2D {
  const box = element.getBoundingClientRect();

  const safeWidth = Math.max(0.1, box.width);
  const safeHeight = Math.max(0.1, box.height);

  return [
    (100 * (event.clientX - box.left)) / safeWidth,
    (100 * (event.clientY - box.top)) / safeHeight,
  ];
}
