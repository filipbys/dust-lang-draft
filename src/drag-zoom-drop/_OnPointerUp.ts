import { assert } from "../development/Errors";
import { fadeOutAndRemove } from "../transitions/FadeOut";
import {
  DEFAULT_ZOOM_PERCENTAGE_FADE_DURATION_MILLIS,
  IDLE_ELEMENT_STATE_DATA,
  TAG,
} from "./_Constants";
import { stopDynamicListeners } from "./_DynamicListeners";
import {
  getElementState,
  getPointerState,
  isDraggingAndOrZooming,
} from "./_ElementState";
import { getPointerPercentageOffset } from "./_PointerPosition";
import { SupportedElement } from "./_Types";

export function onPointerUp(this: SupportedElement, event: PointerEvent) {
  const element = this;
  const elementState = getElementState(element);
  const data = elementState.data;
  assert(isDraggingAndOrZooming(data), elementState, event);
  const removedPointer = getPointerState(data, event);
  if (!removedPointer) {
    return; // Not a relevant pointer
  }
  removedPointer.marker.remove();
  if (data.kind === "draggingAndZooming") {
    console.info(TAG, "draggingAndZooming -> dragging", element, event);
    const {
      zoomPercentageFadeDurationMillis:
        fadeDurationMillis = DEFAULT_ZOOM_PERCENTAGE_FADE_DURATION_MILLIS,
    } = elementState.config;
    const {
      focusedPointMarker,
      pointers: [first, second],
      initialPinnedPosition,
      listeners,
      activeDescendantElements,
      velocityX,
      velocityY,
      mostRecentMovementTimestamp,
    } = data;
    fadeOutAndRemove(focusedPointMarker, fadeDurationMillis);
    const remainingPointer = first === removedPointer ? second : first;
    const focusedPoint = getPointerPercentageOffset(
      element,
      remainingPointer.mostRecentEvent,
    );

    elementState.data = {
      kind: "dragging",
      pointer: remainingPointer,
      initialPinnedPosition,
      listeners,
      focusedPoint,
      activeDescendantElements,
      velocityX,
      velocityY,
      mostRecentMovementTimestamp,
    };
  } else {
    console.info(TAG, "dragging -> idle", element, elementState, event);
    stopDynamicListeners(element, data.listeners, event);
    elementState.data = IDLE_ELEMENT_STATE_DATA;
    const properties = elementState.config.properties;
    assert(
      data.kind === "dragging" && properties.state === "pinned",
      elementState,
      properties,
      event,
    );
    if (data.initialPinnedPosition) {
      properties.center = data.initialPinnedPosition;
      properties.velocity = [0, 0];
    } else {
      // TODO this could result in race conditions where one thing sets the state to "pinned" but then this code overrides that.
      properties.state = "free";
      const velocityAge = data.mostRecentMovementTimestamp - event.timeStamp;
      if (velocityAge > 200) {
        // TODO parameterize this
        properties.velocity = [0, 0];
      }
    }
  }
}
