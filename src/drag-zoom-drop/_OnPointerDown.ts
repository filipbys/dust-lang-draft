import { assert } from "../development/Errors";
import { distanceBetween, vectorAverage } from "../math/Vectors";
import { DEFAULT_POSITION_MARKER_DIAMETER, TAG } from "./_Constants";
import {
  getAllRelevantScrollEventTargets,
  startDynamicListeners,
} from "./_DynamicListeners";
import {
  createBaseActiveElementStateData,
  getElementState,
  getPointerState,
} from "./_ElementState";
import {
  onElementOrAncestorScrolled,
  onPointerMove,
} from "./_OnPointerMoveOrScroll";
import { onPointerUp } from "./_OnPointerUp";
import {
  getPointerPercentageOffset,
  getPointerPosition,
} from "./_PointerPosition";
import { createFocusMarker, createPositionMarker } from "./_PositionMarkers";
import { DynamicListeners, PointerState, SupportedElement } from "./_Types";

export function onPointerDown(this: SupportedElement, event: PointerEvent) {
  const element = this;
  const elementState = getElementState(element);

  const {
    config: {
      properties,
      positionMarkerDiameter = DEFAULT_POSITION_MARKER_DIAMETER,
    },
    data,
  } = elementState;
  assert(getPointerState(data, event) === null, elementState, event);
  if (data.kind === "draggingAndZooming") {
    return; // Already tracking two pointers: ignore any others
  }
  event.stopPropagation();
  const newPointerPercentageOffset = getPointerPercentageOffset(element, event);
  const newPointerMarker = createPositionMarker(
    newPointerPercentageOffset,
    positionMarkerDiameter,
    "pointer",
  );
  const newPointerState: PointerState = {
    marker: newPointerMarker,
    mostRecentEvent: event,
  };

  element.append(newPointerMarker);

  if (data.kind === "idle" || data.kind === "ctrlKeyWheelZooming") {
    console.info(TAG, data.kind, "-> dragging", element, event);
    const { activeDescendantElements, velocityX, velocityY } =
      data.kind === "ctrlKeyWheelZooming"
        ? data
        : createBaseActiveElementStateData(element, elementState.config);
    if (data.kind === "ctrlKeyWheelZooming") {
      data.revertToIdle();
    }
    const listeners: DynamicListeners = {
      onPointerUp: onPointerUp.bind(element),
      onPointerMove: onPointerMove.bind(element),
      onElementOrAncestorScrolled: onElementOrAncestorScrolled.bind(element),
      scrollEventTargets: getAllRelevantScrollEventTargets(element),
    };
    const isPinned = properties.state === "pinned";
    if (!isPinned) {
      properties.state = "pinned";
    }
    elementState.data = {
      kind: "dragging",
      pointer: newPointerState,
      initialPinnedPosition: isPinned ? properties.center : null,
      listeners,
      focusedPoint: newPointerPercentageOffset,
      mostRecentMovementTimestamp: event.timeStamp,
      activeDescendantElements,
      velocityX,
      velocityY,
    };
    startDynamicListeners(element, listeners, event);
  } else if (data.kind === "dragging") {
    console.info(TAG, "dragging -> draggingAndZooming", element, event);
    const newFocusedPoint = vectorAverage(
      data.focusedPoint,
      newPointerPercentageOffset,
    );
    const focusedPointMarker = createFocusMarker(
      newFocusedPoint,
      properties.localScale,
    );
    element.append(focusedPointMarker);
    elementState.data = {
      ...data,
      kind: "draggingAndZooming",
      pointers: [data.pointer, newPointerState],
      focusedPoint: newFocusedPoint,
      focusedPointMarker,
      initialDistanceBetweenPointers: Math.max(
        1,
        distanceBetween(
          getPointerPosition(data.pointer.mostRecentEvent),
          getPointerPosition(event),
        ),
      ),
      initialLocalScale: properties.localScale,
    };
  }
}
