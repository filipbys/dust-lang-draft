import { raise } from "../development/Errors";
import { clamp } from "../math/Numbers";
import { RollingAverage } from "../math/Stats";
import {
  ACTIVE_CLASS_NAME,
  DEFAULT_VELOCITY_ROLLING_AVERAGE_SIZE,
  TAG,
} from "./_Constants";
import {
  DragZoomAndDropConfig,
  DraggingAndOrZoomingElementStateData,
  ElementState,
  ElementStateData,
  PointerState,
  SupportedElement,
} from "./_Types";

const STATE_KEY = Symbol(`${TAG}State`);

export function setElementState(element: Element, state: ElementState) {
  (element as any)[STATE_KEY] = state;
}

export function getElementState(element: Element): ElementState {
  return (
    (element as any)[STATE_KEY] ??
    raise(`${TAG}: ${STATE_KEY.description} was not set`)
  );
}

export function getPointerState(
  data: ElementStateData,
  event: PointerEvent,
): PointerState | null {
  if (data.kind === "dragging") {
    return event.pointerId === pointerId(data.pointer) ? data.pointer : null;
  }
  if (data.kind === "draggingAndZooming") {
    const [first, second] = data.pointers;
    return event.pointerId === pointerId(first)
      ? first
      : event.pointerId === pointerId(second)
      ? second
      : null;
  }
  return null;
}

export function createBaseActiveElementStateData(
  element: SupportedElement,
  {
    velocityRollingAverageSize = DEFAULT_VELOCITY_ROLLING_AVERAGE_SIZE,
  }: DragZoomAndDropConfig,
) {
  return {
    activeDescendantElements: element.getElementsByClassName(ACTIVE_CLASS_NAME),
    velocityX: new RollingAverage(velocityRollingAverageSize),
    velocityY: new RollingAverage(velocityRollingAverageSize),
  };
}

export function isDraggingAndOrZooming(
  data: ElementStateData,
): data is DraggingAndOrZoomingElementStateData {
  return data.kind === "dragging" || data.kind === "draggingAndZooming";
}

export function safeScale(scale: number): number {
  return clamp(0.01, scale, 1000); // TODO coordinate this with getScaleString
}

function pointerId(pointerState: PointerState): number {
  return pointerState.mostRecentEvent.pointerId;
}
