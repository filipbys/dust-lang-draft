import { updateElementText } from "../development/Debugging";
import { Vector2D, X, Y } from "../math/Vectors";
import type { PhysicsSimulationElement } from "./PhysicsSimulationElement";
import { RollingAverage } from "../math/Stats";

// TODO other elements should be draggable too, unless we want to wrap every other draggable element in a sort of "bubble" when dragging them? Alternatively we can add another class like DraggableElement in the hierarchy between PhysicsSimulationElement and HTMLElement.
// The other alternative would be to drag physics-simulation data separately and maintain a hashmap of element ID -> PhysicsSimulationElement
// In the case of dragging, we wouldn't even need that since we have the DragState
export function makeDraggable(element: PhysicsSimulationElement) {
  element.addEventListener("pointerdown", (event) => dragStart(event, element));
}

type DragState = {
  readonly element: PhysicsSimulationElement;
  readonly pointerId: number;
  readonly pointerOffset: Vector2D;
  readonly velocityX: RollingAverage;
  readonly velocityY: RollingAverage;
  previousTimeStampMillis: number;
  readonly dragMove: (event: PointerEvent) => any;
  readonly dragEnd: (event: PointerEvent) => any;
};

function addListeners(event: PointerEvent, dragState: DragState) {
  const htmlElement = dragState.element;
  htmlElement.addEventListener("pointermove", dragState.dragMove);
  htmlElement.addEventListener("pointerup", dragState.dragEnd);
  htmlElement.addEventListener("pointercancel", dragState.dragEnd);
  htmlElement.setPointerCapture(event.pointerId);
  // TODO need to also add scroll listeners to any ancestor elements that can scroll
}

function removeListeners(event: PointerEvent, dragState: DragState) {
  const htmlElement = dragState.element;
  htmlElement.releasePointerCapture(event.pointerId);
  htmlElement.removeEventListener("pointermove", dragState.dragMove);
  htmlElement.removeEventListener("pointerup", dragState.dragEnd);
  htmlElement.removeEventListener("pointercancel", dragState.dragEnd);
}

function dragStart(event: PointerEvent, element: PhysicsSimulationElement) {
  if (element.state !== "free") {
    return;
  }

  element.state = "dragged";

  const rollingAverageSize = 5;
  const dragState: DragState = {
    element,
    pointerId: event.pointerId,
    pointerOffset: [
      event.pageX - element.center[X],
      event.pageY - element.center[Y],
    ],
    velocityX: new RollingAverage(rollingAverageSize),
    velocityY: new RollingAverage(rollingAverageSize),
    previousTimeStampMillis: event.timeStamp,
    dragMove: (event) => dragMove(event, dragState),
    dragEnd: (event) => dragEnd(event, dragState),
  };
  addListeners(event, dragState);
}

function dragMove(event: PointerEvent, dragState: DragState) {
  console.assert(dragState.element.state === "dragged");
  if (event.pointerId !== dragState.pointerId) {
    return;
  }
  updatePositionAndVelocity(event, dragState);
  // TODO if element reaches the edge of the window while dragging, pan the window automatically
  // by applying a force to it. That way it speeds up over time

  event.stopPropagation(); // TODO try removing this

  updateElementText(dragState.element);
}

function dragEnd(event: PointerEvent, dragState: DragState) {
  console.assert(dragState.element.state === "dragged");
  if (event.pointerId !== dragState.pointerId) {
    return;
  }
  dragState.element.state = "free";
  removeListeners(event, dragState);
  updateElementText(dragState.element);
}

function updatePositionAndVelocity(event: PointerEvent, dragState: DragState) {
  const deltaMillis = Math.max(
    1,
    event.timeStamp - dragState.previousTimeStampMillis
  );
  dragState.previousTimeStampMillis = event.timeStamp;

  const element = dragState.element;
  // TODO pageX/Y works when the whole document is scrolled/zoomed,
  // but I don't think it will work if a different ancestor element
  // of htmlElement is scrolled (e.g. a DustWindow within a DustWindowGroup or similar)
  const new_x = event.pageX - dragState.pointerOffset[X];
  const new_y = event.pageY - dragState.pointerOffset[Y];

  dragState.velocityX.add((new_x - element.center[X]) / deltaMillis);
  dragState.velocityY.add((new_y - element.center[Y]) / deltaMillis);

  element.velocity = [
    dragState.velocityX.average(),
    dragState.velocityY.average(),
  ];

  element.center = [new_x, new_y];
}
