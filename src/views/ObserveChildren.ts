import { onCleanup, onMount } from "solid-js";
import { TypeConstructor } from "../type-utils/DynamicTypeChecks";

export type ChildResizeObserverEntry<T extends Element> =
  ResizeObserverEntry & {
    target: T;
  };

export type ChildResizeObserverCallback<
  P extends HTMLElement,
  C extends Element
> = (parent: P, entries: readonly ChildResizeObserverEntry<C>[]) => void;

export function observeChildrenSizes<P extends HTMLElement, C extends Element>(
  parent: P,
  childElementType: TypeConstructor<C>,
  resizeObserverOptions: ResizeObserverOptions,
  callback: ChildResizeObserverCallback<P, C>
) {
  const mutationObserver = createChildSizeMutationObserver(
    parent,
    childElementType,
    resizeObserverOptions,
    callback
  );

  onMount(() => {
    mutationObserver.observe(parent, { childList: true });
    onCleanup(() => mutationObserver.disconnect());
  });
}

export function createChildSizeMutationObserver<
  P extends HTMLElement,
  C extends Element
>(
  parent: P,
  childElementType: TypeConstructor<Element> = Element,
  resizeObserverOptions: ResizeObserverOptions,
  callback: ChildResizeObserverCallback<P, C>
): MutationObserver {
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target.parentElement !== parent) {
        throw "ResizeObserverCallback called on removed child before the parent's MutationCallback";
      }
      if (!(entry.target instanceof childElementType)) {
        throw "ResizeObserverCallback called on child of the wrong type";
      }
    }
    callback(parent, entries as ChildResizeObserverEntry<C>[]);
  });

  return new MutationObserver((mutations: MutationRecord[]) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        mutation.removedNodes.forEach((it) => {
          if (it instanceof childElementType) {
            resizeObserver.unobserve(it);
          }
        });
        mutation.addedNodes.forEach((it) => {
          if (it instanceof childElementType) {
            resizeObserver.observe(it, resizeObserverOptions);
          }
        });
      }
    }
  });
}
