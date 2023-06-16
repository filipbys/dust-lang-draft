import "./DragZoomAndDrop.css";
import { IDLE_ELEMENT_STATE_DATA, TAG } from "./_Constants";
import { setElementState } from "./_ElementState";
import { addOrRemoveEventListener } from "./_EventListeners";
import { onPointerDown } from "./_OnPointerDown";
import { onWheelEvent } from "./_OnPointerMoveOrScroll";
import type { DragZoomAndDropConfig, SupportedElement } from "./_Types";

export type { DragZoomAndDropConfig, SupportedElement } from "./_Types";

// TODO need to either:
// - hook into the physics simulation and get frameCallbacks to update active elements' positions
// - The opposite: the physics simulation needs to track all active dragging elements and call their callbacks (e.g. by dispatching pointer events)
// - When pinning an element, it needs to pin at least its closest physics element ancestor if it has one.

// TODO also: when dragging pinned elements, the element is for all intents and purposes stil there, which has several issues:
// - It leaves behind an empty gap
// - Zooming the element causes jank because the surrounding layout keeps updating, even if the user has zoomed-dragged the element way far away.
// INSTEAD:
// - Create a temporary "hole" element with the same width and height as the dragged element, and replace the dragged element with that "hole".
// - Append the dragged element to the end of its parent with absolute coordinates (can use element.offsetLeft/offsetTop)
// - As the element is dragged, the "hole" doesn't move, so the surrounding layout doesn't get affected.
// - Instead, "drop markers" are shown over the boundaries of nodes where the element would be dropped if the user were to let go.
// - When dragging the element back over the "hole", instead of showing a drop marker, we style the "hole" in a way that matches the drop markers.
// - When the element is dropped, the "hole" is removed and the element is inserted into the appropriate place.
//   The downside is that the editor code would have to use mutation observers to update its TextNodes

export function makeDraggableAndZoomable(
  element: SupportedElement,
  config: DragZoomAndDropConfig,
) {
  element.classList.add("Dust", TAG);
  setElementState(element, {
    config,
    data: IDLE_ELEMENT_STATE_DATA,
  });
  addOrRemoveEventListener("add", element, "pointerdown", onPointerDown);
  addOrRemoveEventListener("add", element, "wheel", onWheelEvent);
}
