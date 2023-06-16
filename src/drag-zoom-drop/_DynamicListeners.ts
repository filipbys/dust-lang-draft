import { ACTIVE_CLASS_NAME } from "./_Constants";
import { addOrRemoveEventListener } from "./_EventListeners";
import { DynamicListeners, SupportedElement } from "./_Types";

export function startDynamicListeners(
  element: SupportedElement,
  listeners: DynamicListeners,
  event: PointerEvent,
) {
  element.classList.add(ACTIVE_CLASS_NAME);
  element.setPointerCapture(event.pointerId);
  addOrRemoveListeners("add", element, listeners);
}

export function stopDynamicListeners(
  element: SupportedElement,
  listeners: DynamicListeners,
  event: PointerEvent,
) {
  element.classList.remove(ACTIVE_CLASS_NAME);
  element.releasePointerCapture(event.pointerId);
  addOrRemoveListeners("remove", element, listeners);
}

function addOrRemoveListeners(
  op: "add" | "remove",
  element: SupportedElement,
  listeners: DynamicListeners,
) {
  addOrRemoveEventListener(op, element, "pointermove", listeners.onPointerMove);
  addOrRemoveEventListener(op, element, "pointerup", listeners.onPointerUp);
  addOrRemoveEventListener(op, element, "pointercancel", listeners.onPointerUp);
  listeners.scrollEventTargets.forEach((scrollable) =>
    addOrRemoveEventListener(
      op,
      scrollable,
      "scroll",
      listeners.onElementOrAncestorScrolled,
      true,
    ),
  );
}

export function getAllRelevantScrollEventTargets(
  element: Element,
): (HTMLElement | Document)[] {
  const targets: (HTMLElement | Document)[] = [document];
  let scrollable: HTMLElement | null | undefined =
    element.closest<HTMLElement>(".scrollable");
  while (scrollable) {
    targets.push(scrollable);
    scrollable = scrollable.parentElement?.closest(".scrollable");
  }
  return targets;
}
