import { Vector2D, X, Y } from "../math/Vectors";

export function setCssPropertyIfChanged(
  element: ElementCSSInlineStyle,
  property: string,
  value: string | null,
) {
  const style = element.style;
  // Avoid triggering mutationobservers if nothing changed
  if (style.getPropertyValue(property) !== value) {
    style.setProperty(property, value);
  }
}

export function setCssCenter(
  element: ElementCSSInlineStyle,
  center: Readonly<Vector2D>,
) {
  setCssPropertyIfChanged(element, "--center-x", center[X] + "px");
  setCssPropertyIfChanged(element, "--center-y", center[Y] + "px");
}

export function setCssDiameter(
  element: ElementCSSInlineStyle,
  diameter: number,
) {
  setCssDiameterLiteral(element, diameter + "px");
}

export function setCssDiameterLiteral(
  element: ElementCSSInlineStyle,
  diameterLiteral: string,
) {
  setCssPropertyIfChanged(element, "--diameter", diameterLiteral);
}

export function setCssScale(
  element: ElementCSSInlineStyle,
  scale: number,
  unit: "" | "%" = "", // TODO rename
) {
  setCssPropertyIfChanged(element, "--scale", scale + unit);
}
