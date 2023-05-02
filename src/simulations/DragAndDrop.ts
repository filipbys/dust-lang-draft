import { updateElementText } from "../development/Debugging";
import {
  Vector2D,
  X,
  Y,
  rounded,
  vectorBetween,
  vectorsApproximatelyEqual,
  vectorsEqual,
} from "../math/Vectors";
import { RollingAverage } from "../math/Stats";
import { HTMLPhysicsSimulationElement } from "./HTMLPhysicsSimulationElement";
import { rectangleDiameter } from "../math/Geometry";

// TODO other elements should be draggable too, unless we want to wrap every other draggable element in a sort of "bubble" when dragging them? Alternatively we can add another class like DraggableElement in the hierarchy between PhysicsSimulationElement and HTMLElement.
export function makeDraggable(element: HTMLPhysicsSimulationElement) {
  element.addEventListener("pointerdown", (event) => dragStart(element, event));
}

type DragListener = (this: HTMLElement, ev: PointerEvent) => any;

type DragState = {
  readonly pointerId: number;
  readonly pointerOffset: Vector2D;
  readonly velocityX: RollingAverage;
  readonly velocityY: RollingAverage;
  previousTimeStampMillis: number;
  readonly dragMove: DragListener;
  readonly dragEnd: DragListener;
};

function addListeners(
  htmlElement: HTMLElement,
  event: PointerEvent,
  dragState: DragState,
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
  dragState: DragState,
) {
  htmlElement.releasePointerCapture(event.pointerId);
  htmlElement.removeEventListener("pointermove", dragState.dragMove);
  htmlElement.removeEventListener("pointerup", dragState.dragEnd);
  htmlElement.removeEventListener("pointercancel", dragState.dragEnd);
}

function dragStart(element: HTMLPhysicsSimulationElement, event: PointerEvent) {
  if (event.target !== element) {
    // TODO check if useCapture prevents this
    console.info("Not dragging child of physics element", element, event);
    return;
  }
  // console.info("dragStart", element.state, element, event);
  // console.info("element:", element.getBoundingClientRect());
  // console.info("pointer:", event.x, event.y);
  // console.info("pointer offset:", event.offsetX, event.offsetY);
  // console.info("pointer screen:", event.screenX, event.screenY);
  // console.info("pointer client:", event.clientX, event.clientY);
  // console.info("pointer page:", event.pageX, event.pageY);
  event.stopPropagation();
  if (element.state !== "free") {
    return;
  }
  console.info("dragStart", element, event);

  element.state = "dragged";

  const rollingAverageSize = 5;
  const dragState: DragState = {
    pointerId: event.pointerId,
    pointerOffset: vectorBetween(getTopLeft(element), pointerPosition(event)),
    velocityX: new RollingAverage(rollingAverageSize),
    velocityY: new RollingAverage(rollingAverageSize),
    previousTimeStampMillis: event.timeStamp,
    dragMove(event) {
      console.assert(element.state === "dragged", element);
      if (event.pointerId !== dragState.pointerId) {
        // TODO! this works with multitouch but it does have some unexpected interactions when a user is simultaneously dragging an element AND one of its ancestors/descendants. There's a similar issue if the element is scaled with CSS transforms. Basically we need to adjust for where the element is actually on screen when calculating the pointerOffset, rather than its claimed center.

        // Maybe try adding dragMove listeners to all ancestor physics elements too? But there's also zooming to take into account
        return;
      }
      console.assert(event.target === element, element, event);

      updatePositionAndVelocity(element, event, dragState);
      // TODO if element reaches the edge of the window while dragging, pan the window automatically
      // by applying a force to it. That way it speeds up over time
    },
    dragEnd(event) {
      console.assert(element.state === "dragged", element);
      if (event.pointerId !== dragState.pointerId) {
        return;
      }
      console.assert(event.target === element, element, event);
      console.info("dragEnd", element, event, dragState);
      element.state = "free";
      removeListeners(element, event, dragState);
      updateElementText(element);
    },
  };
  addListeners(element, event, dragState);
}

function updatePositionAndVelocity(
  element: HTMLPhysicsSimulationElement,
  event: PointerEvent,
  dragState: DragState,
) {
  const deltaMillis = event.timeStamp - dragState.previousTimeStampMillis;
  const deltaMillisSafe = Math.max(1, deltaMillis);
  dragState.previousTimeStampMillis = event.timeStamp;

  // TODO take into account scale and ancestor translations
  const newPosition = vectorBetween(
    dragState.pointerOffset,
    pointerPosition(event),
  );
  const distanceMoved = setTopLeft(element, newPosition);

  dragState.velocityX.add(distanceMoved[X] / deltaMillisSafe);
  dragState.velocityY.add(distanceMoved[Y] / deltaMillisSafe);
  element.velocity = [
    dragState.velocityX.average(),
    dragState.velocityY.average(),
  ];

  updateElementText(element);
}

function getTopLeft(element: HTMLPhysicsSimulationElement): Vector2D {
  return element.clientTopLeft;
}

function setTopLeft(
  element: HTMLPhysicsSimulationElement,
  newTopLeft: Readonly<Vector2D>,
): Vector2D {
  const box = element.getBoundingClientRect();

  // TODO this works at zoom levels close to 100% but gets real wacky around 40% and 130%

  const scaleFactor = box.width / element.offsetDiameter; // client pixels / css pixels
  const delta = vectorBetween([box.left, box.top], newTopLeft);

  const newCenter: Readonly<Vector2D> = [
    element.center[X] + delta[X] * scaleFactor,
    element.center[Y] + delta[Y] * scaleFactor,
  ];

  const distanceMoved = vectorBetween(element.center, newCenter);

  console.log("scaleFactor", scaleFactor);
  console.log("current topLeft", getTopLeft(element));
  console.log("newTopLeft", newTopLeft);
  console.log("current center", element.center);
  console.log("new center", newCenter);
  console.log("distance moved", distanceMoved);

  element.center = newCenter;

  console.assert(
    vectorsApproximatelyEqual(getTopLeft(element), newTopLeft, 5),
    rounded(getTopLeft(element)),
    rounded(newTopLeft),
  );

  return distanceMoved;
}

function pointerPosition(event: PointerEvent): Vector2D {
  // TODO pageX/Y works when the whole document is scrolled/zoomed,
  // but I don't think it will work if a different ancestor element
  // of htmlElement is scrolled (e.g. a DustWindow within a DustWindowGroup or similar)
  // ^^^^^ Exactly: when the window is zoomed, the pointers still give regular screen coordinates, but element.center is in zoomed coordinates. E.g. if window is zoomed out to 10%, then 10px of pointer movement is 100 units of element movement. Maybe that part is something we can fix by tracking the current zoom level in the physicselement
  // offsetX/offsetY don't work either. So we probably need to walk up the tree and adjust for every ancestor's translates and scales
  // AND also need to walk down the tree for any descendant elements who are also being dragged. Currently dragging an ancestor element will pull all its descendants, even if one of them should be pinned down by another pointer. But maybe that's ok? IDK
  return [event.clientX, event.clientY];
}
