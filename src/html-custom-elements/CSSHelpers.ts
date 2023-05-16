import { Vector2D, X, Y } from "../math/Vectors";

export function setCssCenter(element: HTMLElement, center: Readonly<Vector2D>) {
  element.style.setProperty("--center-x", center[X] + "px");
  element.style.setProperty("--center-y", center[Y] + "px");
}

export function setCssDiameter(element: HTMLElement, diameter: number) {
  element.style.setProperty("--diameter", diameter + "px");
}

export function setCssScale(
  element: HTMLElement,
  scale: number,
  unit: "" | "%" = "", // TODO rename
) {
  element.style.setProperty("--scale", scale + unit);
}
