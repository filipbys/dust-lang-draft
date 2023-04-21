import { updateElementText } from "./Debugging";
import type { Vector2D } from "./Vectors";
import type { PhysicsElement } from "./Physics";
import { RollingAverage } from "./Stats";

export function makeDraggable(element: PhysicsElement) {
  element.htmlElement.addEventListener("pointerdown", (event) =>
    dragStart(event, element)
  );
}

type DragState = {
  readonly pointerId: number;
  readonly pointerOffset: Vector2D;
  readonly velocityX: RollingAverage;
  readonly velocityY: RollingAverage;
  previousTimeStampMillis: number;
  readonly dragMove: (event: PointerEvent) => any;
  readonly dragEnd: (event: PointerEvent) => any;
};

function addListeners(
  event: PointerEvent,
  element: PhysicsElement,
  dragState: DragState
) {
  const htmlElement = element.htmlElement;
  htmlElement.addEventListener("pointermove", dragState.dragMove);
  htmlElement.addEventListener("pointerup", dragState.dragEnd);
  htmlElement.addEventListener("pointercancel", dragState.dragEnd);
  htmlElement.setPointerCapture(event.pointerId);
  // TODO need to also add scroll listeners to any ancestor elements that can scroll
}

function removeListeners(
  event: PointerEvent,
  element: PhysicsElement,
  dragState: DragState
) {
  const htmlElement = element.htmlElement;
  htmlElement.releasePointerCapture(event.pointerId);
  htmlElement.removeEventListener("pointermove", dragState.dragMove);
  htmlElement.removeEventListener("pointerup", dragState.dragEnd);
  htmlElement.removeEventListener("pointercancel", dragState.dragEnd);
}

function dragStart(event: PointerEvent, element: PhysicsElement) {
  if (element.state !== "free") {
    return;
  }

  element.state = "dragged";

  const rollingAverageSize = 5;
  const dragState: DragState = {
    pointerId: event.pointerId,
    pointerOffset: {
      x: event.pageX - element.center.x,
      y: event.pageY - element.center.y,
    },
    velocityX: new RollingAverage(rollingAverageSize),
    velocityY: new RollingAverage(rollingAverageSize),
    previousTimeStampMillis: event.timeStamp,
    dragMove: (event) => dragMove(event, element, dragState),
    dragEnd: (event) => dragEnd(event, element, dragState),
  };
  addListeners(event, element, dragState);
}

function dragMove(
  event: PointerEvent,
  element: PhysicsElement,
  dragState: DragState
) {
  console.assert(element.state === "dragged");
  if (event.pointerId !== dragState.pointerId) {
    return;
  }
  updatePositionAndVelocity(event, element, dragState);
  // TODO if element reaches the edge of the window while dragging, pan the window automatically
  // by applying a force to it. That way it speeds up over time

  event.stopPropagation(); // TODO try removing this

  updateElementText(element);
}

function dragEnd(
  event: PointerEvent,
  element: PhysicsElement,
  dragState: DragState
) {
  console.assert(element.state === "dragged");
  if (event.pointerId !== dragState.pointerId) {
    return;
  }
  element.state = "free";
  removeListeners(event, element, dragState);
  updateElementText(element);
}

function updatePositionAndVelocity(
  event: PointerEvent,
  element: PhysicsElement,
  dragState: DragState
) {
  const deltaMillis = Math.max(
    1,
    event.timeStamp - dragState.previousTimeStampMillis
  );
  dragState.previousTimeStampMillis = event.timeStamp;

  // TODO pageX/Y works when the whole document is scrolled/zoomed,
  // but I don't think it will work if a different ancestor element
  // of htmlElement is scrolled (e.g. a DustWindow within a DustWindowGroup or similar)
  const new_x = event.pageX - dragState.pointerOffset.x;
  const new_y = event.pageY - dragState.pointerOffset.y;

  dragState.velocityX.add((new_x - element.center.x) / deltaMillis);
  dragState.velocityY.add((new_y - element.center.y) / deltaMillis);

  element.velocity.x = dragState.velocityX.average();
  element.velocity.y = dragState.velocityY.average();

  // TODO defer until next frame!
  element.center = { x: new_x, y: new_y };
}
