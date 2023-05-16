import { assert } from "../development/Errors";
import { Vector2D, X, Y, vectorBetween, vectorTimes } from "../math/Vectors";
import {
  DragZoomAndDropProperties,
  ElementState,
  PointerState,
} from "./_Types";

// returns css pixels / client pixels
function getScaleFactor(element: HTMLElement): number {
  return (
    Math.max(0.1, element.offsetWidth) /
    Math.max(0.1, element.getBoundingClientRect().width)
  );
}

function updatePositionAndVelocity(
  elementState: ElementState,
  event: MouseEvent,
  pointerState: PointerState,
) {
  const htmlElement = elementState.htmlElement;
  const scaleFactor = getScaleFactor(htmlElement); // element css pixels / client pixels

  const newPosition = vectorBetween(
    vectorTimes(
      pointerState.initialPositionWithinElement,
      pointerState.initialScaleFactor / scaleFactor,
    ),
    getPointerPosition(event),
  );
  const distanceMoved = setTopLeft(
    htmlElement,
    elementState.properties,
    newPosition,
  );

  const deltaMillis = event.timeStamp - pointerState.mostRecentEvent.timeStamp;
  if (deltaMillis > 0) {
    const deltaMillisSafe = Math.max(1, deltaMillis);
    elementState.velocityX.add(distanceMoved[X] / deltaMillisSafe);
    elementState.velocityY.add(distanceMoved[Y] / deltaMillisSafe);
  }
  elementState.properties.velocity = [
    elementState.velocityX.average(),
    elementState.velocityY.average(),
  ];
}

export function getPointerPosition(event: MouseEvent): Vector2D {
  return [event.clientX, event.clientY];
}

function getTopLeft(element: Element): Vector2D {
  const box = element.getBoundingClientRect();
  return [box.left, box.top];
}

// export function getPointerPercentageOffset(
//   element: Element,
//   event: MouseEvent,
// ): Vector2D {
//   const box = element.getBoundingClientRect();

//   assert(
//     box.left <= event.clientX &&
//       event.clientX <= box.right &&
//       box.top <= event.clientY &&
//       event.clientY <= box.bottom,
//     element,
//     event,
//     box,
//     getPointerPosition(event),
//   );

//   const safeWidth = Math.max(0.1, box.width);
//   const safeHeight = Math.max(0.1, box.height);

//   return [
//     100 * (event.clientX - box.left) / safeWidth,
//     100 * (event.clientY - box.top) / safeHeight,
//   ];
// }

function setTopLeft(
  element: Element,
  properties: DragZoomAndDropProperties,
  newTopLeft: Readonly<Vector2D>,
): Vector2D {
  const rectangle = element.getBoundingClientRect();
  const delta = vectorBetween([rectangle.left, rectangle.top], newTopLeft); // client pixels

  const parentElement = element.parentElement!;

  const scaleFactor = getScaleFactor(parentElement); // parent css pixels / client pixels

  const center = properties.center;
  const newCenter: Readonly<Vector2D> = [
    center[X] + delta[X] * scaleFactor,
    center[Y] + delta[Y] * scaleFactor,
  ];
  // TODO!! limit the max velocity (i.e. max distanceMoved/deltaMillis) so elements don't go flying offscreen
  properties.center = newCenter;
  return vectorBetween(center, newCenter);
}
