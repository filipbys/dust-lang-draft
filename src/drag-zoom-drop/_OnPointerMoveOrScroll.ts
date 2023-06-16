import { assert } from "../development/Errors";
import { clamp } from "../math/Numbers";
import {
  Vector2D,
  X,
  Y,
  distanceBetween,
  vectorAverage,
  vectorBetween,
  vectorsEqual,
} from "../math/Vectors";
import { fadeOut, fadeOutAndRemove } from "../transitions/FadeOut";
import { assertIsInstance } from "../type-utils/DynamicTypeChecks";
import {
  DEFAULT_CTRL_KEY_WHEEL_ZOOMING_PIN_DURATION_MILLIS,
  DEFAULT_ZOOM_PERCENTAGE_FADE_DURATION_MILLIS,
  IDLE_ELEMENT_STATE_DATA,
  isSupported,
} from "./_Constants";
import {
  createBaseActiveElementStateData,
  getElementState,
  getPointerState,
  isDraggingAndOrZooming,
  safeScale,
} from "./_ElementState";
import {
  getPointerPercentageOffset,
  getPointerPosition,
} from "./_PointerPosition";
import {
  createFocusMarker,
  setFocusMarkerScaleText,
  setPositionMarkerOffset,
} from "./_PositionMarkers";
import {
  ActiveElementStateData,
  CtrlKeyWheelZoomingElementStateData,
  DragZoomAndDropProperties,
  SupportedElement,
} from "./_Types";

export function onPointerMove(this: SupportedElement, event: PointerEvent) {
  const {
    data,
    config: { properties },
  } = getElementState(this);
  assert(isDraggingAndOrZooming(data), this, event);
  const movedPointer = getPointerState(data, event);
  if (movedPointer !== null) {
    movedPointer.mostRecentEvent = event;
    moveElement(this, data, properties, event.timeStamp);
  }
}

export function onElementOrAncestorScrolled(
  this: SupportedElement,
  event: Event,
) {
  const {
    data,
    config: { properties },
  } = getElementState(this);
  assert(isDraggingAndOrZooming(data), data, this, event);
  // TODO this has the same potential problem as onPointerMove: we want to guarantee that shallower nodes get updated before deeper ones.
  // TODO this works well most of the time but is still a bit stuttery sometimes. requestAnimationFrame didn't seem to help.
  moveElement(this, data, properties, event.timeStamp);
}

export function onWheelEvent(this: SupportedElement, event: WheelEvent) {
  if (!event.ctrlKey) {
    return; // Allow default scroll behavior: normal scroll up and down, and shift+scroll left and right
  }
  const element = this;
  const elementState = getElementState(element);
  const data = elementState.data;
  if (data.kind === "draggingAndZooming") {
    return; // Pointer-based zooming takes precedence
  }
  event.preventDefault();
  event.stopPropagation();

  const scaleDelta = clamp(-20, event.deltaY, 20) * -0.01;
  const scaleFactor = 1.0 + scaleDelta;

  const {
    properties,
    zoomPercentageFadeDurationMillis:
      fadeDurationMillis = DEFAULT_ZOOM_PERCENTAGE_FADE_DURATION_MILLIS,
    ctrlKeyWheelZoomingPinDurationMillis:
      pinDurationMillis = DEFAULT_CTRL_KEY_WHEEL_ZOOMING_PIN_DURATION_MILLIS,
  } = elementState.config;
  const newScale = safeScale(properties.localScale * scaleFactor);
  if (data.kind === "dragging") {
    function scheduleFadeOut(zoomPercentage: {
      readonly marker: HTMLElement;
      timeoutID: number;
    }) {
      const style = zoomPercentage.marker.style;
      style.transition = "";
      style.opacity = "1";
      zoomPercentage.timeoutID = setTimeout(() => {
        zoomPercentage.timeoutID = fadeOut(
          zoomPercentage.marker,
          fadeDurationMillis,
          () => {
            if (data.kind === "dragging") {
              data.zoomPercentage = undefined;
            }
            zoomPercentage.marker.remove();
          },
        );
      }, pinDurationMillis);
    }
    if (!data.zoomPercentage) {
      // TODO cursor: none isn't working here so maybe we need to move/offset it a bit away from the cursor.
      const focusedPoint = getPointerPercentageOffset(element, event);
      const marker = createFocusMarker(focusedPoint, newScale);
      element.append(marker);
      data.zoomPercentage = {
        marker: marker,
        timeoutID: 0,
      };
      scheduleFadeOut(data.zoomPercentage);
    } else {
      const zoomPercentage = data.zoomPercentage;
      setFocusMarkerScaleText(zoomPercentage.marker, newScale);
      clearTimeout(zoomPercentage.timeoutID);
      scheduleFadeOut(zoomPercentage);
    }
    properties.localScale = newScale;
    moveElement(element, data, properties, event.timeStamp);
    // TODO update the pointer marker's text with the scale unless it's exactly 100%,
    // or just add another marker and immediately start fading it out
    return;
  }
  if (data.kind === "idle") {
    const wasFree = properties.state === "free";
    if (wasFree) {
      properties.state = "pinned"; // TODO try not doing this
    }
    const focusedPoint = getPointerPercentageOffset(element, event);
    const focusedPointMarker = createFocusMarker(focusedPoint, newScale);
    element.append(focusedPointMarker);

    function revertToIdle() {
      const data = elementState.data;
      assert(
        data.kind === "ctrlKeyWheelZooming" && properties.state === "pinned",
        data,
        properties.state,
        element,
      );
      console.info("ctrlKeyWheelZooming -> idle", element, properties.state);
      clearTimeout(data.timeoutID);
      if (data.initialPinnedPosition) {
        properties.center = data.initialPinnedPosition;
      } else {
        properties.state = "free";
      }
      properties.velocity = [0, 0];
      fadeOutAndRemove(focusedPointMarker, fadeDurationMillis);
      elementState.data = IDLE_ELEMENT_STATE_DATA;
    }

    const newData: CtrlKeyWheelZoomingElementStateData = {
      kind: "ctrlKeyWheelZooming",
      focusedPointMarker,
      initialPinnedPosition: wasFree ? null : properties.center,
      revertToIdle,
      timeoutID: setTimeout(revertToIdle, pinDurationMillis),
      mostRecentEvent: event,
      focusedPoint,
      mostRecentMovementTimestamp: event.timeStamp,
      ...createBaseActiveElementStateData(element, elementState.config),
    };
    elementState.data = newData;
    properties.localScale = newScale;
    moveElement(element, newData, properties, event.timeStamp);
  } else {
    const { focusedPointMarker: marker, revertToIdle, timeoutID } = data;
    clearTimeout(timeoutID);
    marker.style.transition = "";
    marker.style.opacity = "1";
    setFocusMarkerScaleText(marker, newScale);
    data.timeoutID = setTimeout(revertToIdle, pinDurationMillis);
    data.mostRecentEvent = event;
    properties.localScale = newScale;
    moveElement(element, data, properties, event.timeStamp);
  }
}

function moveElement(
  element: SupportedElement,
  data: ActiveElementStateData,
  properties: DragZoomAndDropProperties,
  timeStamp: number,
  notifyActiveDescendants = true,
) {
  let target: Vector2D;
  if (data.kind === "dragging") {
    target = getPointerPercentageOffset(element, data.pointer.mostRecentEvent);
  } else if (data.kind === "draggingAndZooming") {
    const [firstPointer, secondPointer] = data.pointers;
    const distance = distanceBetween(
      getPointerPosition(firstPointer.mostRecentEvent),
      getPointerPosition(secondPointer.mostRecentEvent),
    );
    const newScale = safeScale(
      (data.initialLocalScale * distance) / data.initialDistanceBetweenPointers,
    );
    setFocusMarkerScaleText(data.focusedPointMarker, newScale);
    properties.localScale = newScale;

    const firstPointerOffset = getPointerPercentageOffset(
      element,
      firstPointer.mostRecentEvent,
    );
    const secondPointerOffset = getPointerPercentageOffset(
      element,
      secondPointer.mostRecentEvent,
    );
    setPositionMarkerOffset(firstPointer.marker, firstPointerOffset);
    setPositionMarkerOffset(secondPointer.marker, secondPointerOffset);
    target = vectorAverage(firstPointerOffset, secondPointerOffset);
  } else {
    target = getPointerPercentageOffset(element, data.mostRecentEvent);
  }
  const percentMovement = vectorBetween(data.focusedPoint, target);

  const currentCenter = properties.center;
  const newCenter: Vector2D = [
    currentCenter[X] + (percentMovement[X] * element.offsetWidth) / 100,
    currentCenter[Y] + (percentMovement[Y] * element.offsetHeight) / 100,
  ];
  if (vectorsEqual(currentCenter, newCenter)) {
    return;
  }
  const distanceMoved = vectorBetween(currentCenter, newCenter);
  properties.center = newCenter;
  const deltaMillis = Math.max(1, timeStamp - data.mostRecentMovementTimestamp);
  data.mostRecentMovementTimestamp = timeStamp;
  data.velocityX.add(distanceMoved[X] / deltaMillis);
  data.velocityY.add(distanceMoved[Y] / deltaMillis);
  properties.velocity = [data.velocityX.average(), data.velocityY.average()];
  if (notifyActiveDescendants) {
    for (const descendant of data.activeDescendantElements) {
      assert(element !== descendant, element, descendant);
      assert(isSupported(descendant), element, descendant);
      const descendantState = getElementState(descendant);
      const data = descendantState.data;
      if (data.kind !== "idle") {
        moveElement(
          descendant,
          data,
          descendantState.config.properties,
          timeStamp,
          /* notifyActiveDescendants */ false,
        );
      }
    }
  }
}
