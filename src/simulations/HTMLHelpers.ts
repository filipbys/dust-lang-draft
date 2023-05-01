import { Rectangle } from "../math/Geometry";

// export function setDiameter(
//   htmlElement: HTMLElement,
//   newDiameter: number,
//   centeredWithinParent?: boolean,
// ) {
//   // TODO try custom css properties for this as well (see above)
//   const roundedDiameter = Math.round(newDiameter);
//   const style = htmlElement.style;
//   style.width = roundedDiameter + "px";
//   style.height = roundedDiameter + "px";
//   style.borderRadius = roundedDiameter + "px"; // just needs to be bigger than the element's radius

//   if (centeredWithinParent) {
//     centerWithinParent(htmlElement, newDiameter);
//   }
// }

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
