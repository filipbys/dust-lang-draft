import { assert, logAndThrow, raise } from "../development/Errors";
import { RollingAverage } from "../math/Stats";
import {
  Vector2D,
  X,
  Y,
  distanceBetween,
  vectorAverage,
  vectorBetween,
} from "../math/Vectors";
import {
  createPositionMarker,
  setPositionMarkerOffset,
} from "./_PositionMarkers";
import { getPointerPosition } from "./_PositionAndMovement";
import {
  DragZoomAndDropConfig,
  ElementState,
  ElementStateData,
  PointerState,
  StaticListeners,
} from "./_Types";
import {
  startDynamicListeners,
  stopDynamicListeners,
} from "./_DynamicListeners";

const DEFAULT_VELOCITY_ROLLING_AVERAGE_SIZE = 5;

const TAG = "DragZoomAndDrop";

export function makeDraggableAndZoomable(
  htmlElement: HTMLElement,
  {
    properties,
    positionMarkerDiameter,
    velocityRollingAverageSize = DEFAULT_VELOCITY_ROLLING_AVERAGE_SIZE,
  }: DragZoomAndDropConfig,
) {
  const elementState: ElementState & StaticListeners = {
    properties,
    velocityX: new RollingAverage(velocityRollingAverageSize),
    velocityY: new RollingAverage(velocityRollingAverageSize),
    data: { kind: "idle" },
    onPointerDown(event: PointerEvent) {
      const data = elementState.data;
      assert(getPointerState(data, event) === null, elementState, event);
      if (data.kind === "zooming") {
        return; // Already tracking two pointers: ignore any others
      }
      event.stopPropagation();
      const newPointerPercentageOffset = getPointerPercentageOffset(event);
      const newPointerMarker = createPositionMarker(
        newPointerPercentageOffset,
        positionMarkerDiameter,
        "pointer",
      );
      const newPointerState: PointerState = {
        marker: newPointerMarker,
        mostRecentEvent: event,
      };

      htmlElement.append(newPointerMarker);
      if (data.kind === "idle") {
        console.info(TAG, "idle -> dragging", htmlElement, elementState, event);
        if (properties.state === "pinned") {
          elementState.initialPinnedPosition = properties.center;
        } else {
          properties.state = "pinned";
        }
        elementState.data = {
          kind: "dragging",
          pointer: newPointerState,
          focusedPoint: newPointerPercentageOffset,
        };
        startDynamicListeners(htmlElement, elementState, event);
      } else if (data.kind === "dragging") {
        console.info(
          TAG,
          "dragging -> zooming",
          htmlElement,
          elementState,
          event,
        );
        const newFocusedPoint = vectorAverage(
          data.focusedPoint,
          newPointerPercentageOffset,
        );
        const focusedPointMarker = createPositionMarker(
          newFocusedPoint,
          positionMarkerDiameter,
          "focus",
        );
        htmlElement.append(focusedPointMarker);
        elementState.data = {
          kind: "zooming",
          pointers: [data.pointer, newPointerState],
          focusedPoint: newFocusedPoint,
          focusedPointMarker,
          initialDistanceBetweenPointers: distanceBetween(
            getPointerPosition(data.pointer.mostRecentEvent),
            getPointerPosition(event),
          ),
          initialLocalScale: properties.localScale,
        };
      }
    },
    onPointerUpOrCancel(event: PointerEvent) {
      const data = elementState.data;
      assert(data.kind !== "idle", elementState, event);
      const removedPointer = getPointerState(data, event);
      if (!removedPointer) {
        return; // some other pointer
      }
      removedPointer.marker.remove();
      if (data.kind === "zooming") {
        console.info(
          TAG,
          "zooming -> dragging",
          htmlElement,
          elementState,
          event,
        );
        data.focusedPointMarker.remove();
        const [first, second] = data.pointers;
        const remaining = first === removedPointer ? second : first;
        const focus = getPointerPercentageOffset(remaining.mostRecentEvent);
        elementState.data = {
          kind: "dragging",
          focusedPoint: focus,
          pointer: remaining,
        };
      } else {
        console.info(TAG, "dragging -> idle", htmlElement, elementState, event);
        stopDynamicListeners(htmlElement, elementState, event);
        assert(
          data.kind === "dragging" && properties.state === "pinned",
          elementState,
          properties,
          event,
        );
        elementState.data = { kind: "idle" };
        if (elementState.initialPinnedPosition) {
          // TODO try animating this
          properties.center = elementState.initialPinnedPosition;
          properties.velocity = [0, 0];
          elementState.initialPinnedPosition = undefined;
        } else {
          properties.state = "free";
          const velocityAge =
            removedPointer.mostRecentEvent.timeStamp - event.timeStamp;
          if (velocityAge > 200) {
            properties.velocity = [0, 0];
          }
          // TODO make sure the velocity is accurate here: if the pointer was still for a while, we should remove the older events from the rollingAverages.
        }
      }
    },
    onPointerMove(event: PointerEvent) {
      const data = elementState.data;
      assert(data.kind !== "idle", elementState, event);
      // if (movedPointer === null) {
      //   if (data.kind === "dragging") {

      //   }
      //   return; // some other pointer
      // }
      const deltaMillis = Math.max(
        1,
        event.timeStamp -
          (data.kind === "dragging"
            ? data.pointer.mostRecentEvent.timeStamp
            : Math.max(
                data.pointers[0].mostRecentEvent.timeStamp,
                data.pointers[1].mostRecentEvent.timeStamp,
              )),
      );
      const movedPointer = getPointerState(data, event);
      if (movedPointer !== null) {
        movedPointer.mostRecentEvent = event;
      }

      let target: Vector2D;
      if (data.kind === "dragging") {
        target = getPointerPercentageOffset(data.pointer.mostRecentEvent);
      } else {
        const [firstPointer, secondPointer] = data.pointers;
        const distance = distanceBetween(
          getPointerPosition(firstPointer.mostRecentEvent),
          getPointerPosition(secondPointer.mostRecentEvent),
        );
        properties.localScale =
          (data.initialLocalScale * distance) /
          data.initialDistanceBetweenPointers;

        const firstPointerOffset = getPointerPercentageOffset(
          firstPointer.mostRecentEvent,
        );
        const secondPointerOffset = getPointerPercentageOffset(
          secondPointer.mostRecentEvent,
        );
        setPositionMarkerOffset(firstPointer.marker, firstPointerOffset);
        setPositionMarkerOffset(secondPointer.marker, secondPointerOffset);
        target = vectorAverage(firstPointerOffset, secondPointerOffset);
      }
      const percentMovement = vectorBetween(data.focusedPoint, target);

      const newCenter: Vector2D = [
        properties.center[X] +
          (percentMovement[X] * htmlElement.offsetWidth) / 100,
        properties.center[Y] +
          (percentMovement[Y] * htmlElement.offsetHeight) / 100,
      ];
      const distanceMoved = vectorBetween(properties.center, newCenter);
      elementState.velocityX.add(distanceMoved[X] / deltaMillis);
      elementState.velocityY.add(distanceMoved[Y] / deltaMillis);
      properties.velocity = [
        elementState.velocityX.average(),
        elementState.velocityY.average(),
      ];
      properties.center = newCenter;
    },
    onAncestorElementMoved(event: Event) {
      // TODO
      console.warn("onAncestorElementMoved");
    },
    onWheelEvent(event: WheelEvent) {},
  };

  htmlElement.classList.add("transformable");
  htmlElement.addEventListener("pointerdown", elementState.onPointerDown);
  htmlElement.addEventListener("wheel", elementState.onWheelEvent);

  function getPointerPercentageOffset(event: MouseEvent): Vector2D {
    const box = htmlElement.getBoundingClientRect();

    const safeWidth = Math.max(0.1, box.width);
    const safeHeight = Math.max(0.1, box.height);

    return [
      (100 * (event.clientX - box.left)) / safeWidth,
      (100 * (event.clientY - box.top)) / safeHeight,
    ];
  }
}

function pointerId(pointerState: PointerState): number {
  return pointerState.mostRecentEvent.pointerId;
}

function getPointerState(
  data: ElementStateData,
  event: PointerEvent,
): PointerState | null {
  if (data.kind === "idle") {
    return null;
  }
  if (data.kind === "dragging") {
    return event.pointerId === pointerId(data.pointer) ? data.pointer : null;
  }
  assert(data.kind === "zooming", data, event);
  const [first, second] = data.pointers;
  return event.pointerId === pointerId(first)
    ? first
    : event.pointerId === pointerId(second)
    ? second
    : null;
}
