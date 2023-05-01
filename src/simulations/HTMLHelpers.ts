import { Rectangle } from "../math/Geometry";
import { Vector2D, X, Y } from "../math/Vectors";

// TODO move these into a separate file
export function setTranslate(
  htmlElement: HTMLElement,
  newTranslate: Readonly<Vector2D>,
) {
  // TODO try using custom css properties:
  // - js: style.setPropery("--translate-x", x + "px")
  //       style.setPropery("--translate-y", y + "px")
  // - css: transform: translate(var(--translate-x), var(--translate-y))
  // see https://thomaswilburn.github.io/wc-book/sd-behavioral.html
  htmlElement.style.transform = `translate(${newTranslate[X]}px, ${newTranslate[Y]}px)`;
}

export function setDiameter(
  htmlElement: HTMLElement,
  newDiameter: number,
  centeredWithinParent?: boolean,
) {
  // TODO try custom css properties for this as well (see above)
  const roundedDiameter = Math.round(newDiameter);
  const style = htmlElement.style;
  style.width = roundedDiameter + "px";
  style.height = roundedDiameter + "px";
  style.borderRadius = roundedDiameter + "px"; // just needs to be bigger than the element's radius

  if (centeredWithinParent) {
    centerWithinParent(htmlElement, newDiameter);
  }
}

export function centerWithinParent(htmlElement: HTMLElement, diameter: number) {
  // Center the element on its parent (movement within parent uses css transform: translate)
  const roundedRadius = Math.round(diameter / 2);
  const style = htmlElement.style;
  style.position = "absolute";
  style.left = `calc(50% - ${roundedRadius}px)`;
  style.top = `calc(50% - ${roundedRadius}px)`;
}

export function centerRectangleWithinParent(
  htmlElement: HTMLElement,
  rectangle: Rectangle,
) {
  // Center the element on its parent (movement within parent uses css transform: translate)
  const style = htmlElement.style;
  style.position = "absolute";
  style.left = `calc(50% - ${rectangle.width / 2}px)`;
  style.top = `calc(50% - ${rectangle.height / 2}px)`;
}
