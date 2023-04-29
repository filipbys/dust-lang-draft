import { updateElementText } from "../development/Debugging";
import { Vector2D, X, Y } from "../math/Vectors";
import { RollingAverage } from "../math/Stats";
import { HTMLPhysicsSimulationElement } from "./HTMLPhysicsSimulationElement";
import { safeCast } from "../type-utils/DynamicTypeChecks";
import { raise } from "../development/Errors";

// TODO other elements should be draggable too, unless we want to wrap every other draggable element in a sort of "bubble" when dragging them? Alternatively we can add another class like DraggableElement in the hierarchy between PhysicsSimulationElement and HTMLElement.
export function makeDraggable(element: HTMLPhysicsSimulationElement) {
  console.info("Making this draggable:", element);
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

function getClosestPhysicsElement(
  event: PointerEvent
): HTMLPhysicsSimulationElement {
  let element = safeCast(event.target, HTMLElement);
  if (element instanceof HTMLPhysicsSimulationElement) {
    return element;
  }

  // TODO make element.state queryable by CSS so we can find the closest free element
  return (
    element.closest<HTMLPhysicsSimulationElement>(
      HTMLPhysicsSimulationElement.TAG
    ) ||
    raise(
      "Element does not have any draggable ancestors, and yet a drag listener was added to it: " +
        element
    )
  );
}

function dragStart(event: PointerEvent) {
  console.info("dragStart", event);
  const element = getClosestPhysicsElement(event); // TODO this probably isn't actually what we want: if something other than a physics element gets dragged, we want to temporarily wrap it inside of a physics element bubble and only drag that bubble. Currently it drags the closest ancestor which will end up dragging all of the element's siblings as well
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
  const element = getClosestPhysicsElement(event);

  console.debug("dragMove", element.state, dragState, event);
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
  const element = getClosestPhysicsElement(event);
  console.info("dragEnd", element.state, dragState, event);
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
  // ^^^^^ Exactly: when the window is zoomed, the pointers still give regular screen coordinates, but element.center is in zoomed coordinates. E.g. if window is zoomed out to 10%, then 10px of pointer movement is 100 units of element movement. Maybe that part is something we can fix by tracking the current zoom level in the physicselement
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
