import { DynamicListeners } from "./_Types";

export function startDynamicListeners(
  htmlElement: HTMLElement,
  listeners: DynamicListeners,
  event: PointerEvent,
) {
  htmlElement.setPointerCapture(event.pointerId);

  // TODO add the move listener to the document instead of the element: any pointer move might affect this element's position (e.g. if moving an ancestor) so every dragging element needs to listen for it.
  document.addEventListener("pointermove", listeners.onPointerMove);
  htmlElement.addEventListener("pointerup", listeners.onPointerUpOrCancel);
  htmlElement.addEventListener("pointercancel", listeners.onPointerUpOrCancel);
  forEachScrollableElementOrAncestor(htmlElement, (scrollable) =>
    scrollable.addEventListener("scroll", listeners.onAncestorElementMoved),
  );
}

export function stopDynamicListeners(
  htmlElement: HTMLElement,
  listeners: DynamicListeners,
  event: PointerEvent,
) {
  htmlElement.releasePointerCapture(event.pointerId);

  document.removeEventListener("pointermove", listeners.onPointerMove);
  htmlElement.removeEventListener("pointerup", listeners.onPointerUpOrCancel);
  htmlElement.removeEventListener(
    "pointercancel",
    listeners.onPointerUpOrCancel,
  );
  forEachScrollableElementOrAncestor(htmlElement, (scrollable) =>
    scrollable.removeEventListener("scroll", listeners.onAncestorElementMoved),
  );
}

function forEachScrollableElementOrAncestor(
  element: Element,
  callback: (scrollable: Element | Document) => void,
) {
  let scrollable: Element | null | undefined = element.closest(".scrollable");
  while (scrollable) {
    callback(scrollable);
    scrollable = scrollable.parentElement?.closest(".scrollable");
  }
  callback(document);
}
