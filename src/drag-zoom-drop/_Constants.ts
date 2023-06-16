import { ElementStateData, SupportedElement } from "./_Types";

export const TAG = "DragZoomAndDrop";

export const ACTIVE_CLASS_NAME = `${TAG}Active`;

export const DEFAULT_VELOCITY_ROLLING_AVERAGE_SIZE = 5;

export const DEFAULT_POSITION_MARKER_DIAMETER = "40px";

export const DEFAULT_ZOOM_PERCENTAGE_FADE_DURATION_MILLIS = 500;

export const DEFAULT_CTRL_KEY_WHEEL_ZOOMING_PIN_DURATION_MILLIS = 500;

export const IDLE_ELEMENT_STATE_DATA: ElementStateData = { kind: "idle" };

export function isSupported(element: Element): element is SupportedElement {
  return element instanceof HTMLElement || element instanceof SVGElement;
}
