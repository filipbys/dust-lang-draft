import { SupportedElement } from "./_Types";

export function addOrRemoveEventListener<
  E extends SupportedElement | Document,
  K extends keyof GlobalEventHandlersEventMap,
>(
  operation: "add" | "remove",
  element: E,
  type: K,
  listener: (this: E, ev: GlobalEventHandlersEventMap[K]) => any,
  options?: boolean | AddEventListenerOptions,
) {
  // if (element instanceof SVGElement) {
  //   element.addEventListener(type, listener, options);
  // }
  // if (element instanceof HTMLElement) {
  //   element.addEventListener(type, listener, options);
  // }

  // Type cast is needed because Typescript doesn't know that the following code is equivalent to the above, which Typescript accepts without error
  const genericListener = listener as EventListenerOrEventListenerObject;
  if (operation === "add") {
    element.addEventListener(type, genericListener, options);
  } else {
    element.removeEventListener(type, genericListener, options);
  }
}
