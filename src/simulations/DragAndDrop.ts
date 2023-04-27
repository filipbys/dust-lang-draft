import { updateElementText } from "../development/Debugging";
import { Vector2D, X, Y } from "../math/Vectors";
import { RollingAverage } from "../math/Stats";
import { HTMLPhysicsSimulationElement } from "./HTMLPhysicsSimulationElement";
import { safeCast } from "../type-utils/DynamicTypeChecks";

// TODO other elements should be draggable too, unless we want to wrap every other draggable element in a sort of "bubble" when dragging them? Alternatively we can add another class like DraggableElement in the hierarchy between PhysicsSimulationElement and HTMLElement.
export function makeDraggable(element: HTMLPhysicsSimulationElement) {
  element.addEventListener("pointerdown", dragStart);
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
  htmlElement: HTMLElement,
  event: PointerEvent,
  dragState: DragState
) {
  htmlElement.addEventListener("pointermove", dragState.dragMove);
  htmlElement.addEventListener("pointerup", dragState.dragEnd);
  htmlElement.addEventListener("pointercancel", dragState.dragEnd);
  htmlElement.setPointerCapture(event.pointerId);
  // TODO need to also add scroll listeners to any ancestor elements that can scroll
}

function removeListeners(
  htmlElement: HTMLElement,
  event: PointerEvent,
  dragState: DragState
) {
  htmlElement.releasePointerCapture(event.pointerId);
  htmlElement.removeEventListener("pointermove", dragState.dragMove);
  htmlElement.removeEventListener("pointerup", dragState.dragEnd);
  htmlElement.removeEventListener("pointercancel", dragState.dragEnd);
}

function dragStart(event: PointerEvent) {
  const element = safeCast(event.target, HTMLPhysicsSimulationElement);
  console.log("dragStart", element.state, event);
  if (element.state !== "free") {
    return;
  }

  element.state = "dragged";

  const rollingAverageSize = 5;
  const dragState: DragState = {
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
  addListeners(element, event, dragState);
}

function dragMove(event: PointerEvent, dragState: DragState) {
  const element = safeCast(event.target, HTMLPhysicsSimulationElement);

  console.log("dragMove", element.state, dragState, event);
  console.assert(element.state === "dragged");
  if (event.pointerId !== dragState.pointerId) {
    return;
  }

  updatePositionAndVelocity(element, event, dragState);
  // TODO if element reaches the edge of the window while dragging, pan the window automatically
  // by applying a force to it. That way it speeds up over time

  event.stopPropagation(); // TODO try removing this

  updateElementText(element);
}

function dragEnd(event: PointerEvent, dragState: DragState) {
  const element = safeCast(event.target, HTMLPhysicsSimulationElement);
  console.log("dragEnd", element.state, dragState, event);
  console.assert(element.state === "dragged");
  if (event.pointerId !== dragState.pointerId) {
    return;
  }
  element.state = "free";
  removeListeners(element, event, dragState);
  updateElementText(element);
}

function updatePositionAndVelocity(
  element: HTMLPhysicsSimulationElement,
  event: PointerEvent,
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
