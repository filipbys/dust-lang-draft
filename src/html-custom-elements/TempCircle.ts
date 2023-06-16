// TODO redo all circles as SVG instead of using border radius
// Most touch events seem to work correctly with border radius, but native touch scrolling doesn't seem to take it into account, so tap+dragging on the outside corner of a circular DIV will end up not doing anything: the DIV doesn't get the touch event so it doesn't get dragged, and the browser doesn't initiate the scrolling, so nothing happens and it's a confusing user experience.

// All circles are wrappers around either:
//  (1) A rectangular HTML element
//  (2) A circular SVG sub-group.

// But instead of trying to nest those things inside of the SVG circle, we just keep them together as a pair:
export type CircleWrapper = {
  circle: SVGCircleElement; // Drawn in the parent's svg viewport. Handles drag-zoom-drop and stores the physics data.
  wrappedElement: HTMLElement | SVGElement; // Might be a rectangle, or it might be a circular SVG sub-viewport with a bunch of nested circles.
};
