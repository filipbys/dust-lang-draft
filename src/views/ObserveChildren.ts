import { onCleanup, onMount } from "solid-js";
import { elementDiameter, rectangleDiameter } from "../math/Geometry";
import { HTMLPhysicsSimulationElement } from "../simulations/HTMLPhysicsSimulationElement";
import { TypeConstructor } from "../type-utils/DynamicTypeChecks";

export type ChildResizeObserverEntry<T extends Element> =
  ResizeObserverEntry & {
    target: T;
  };

export type ChildResizeObserverCallback<
  P extends HTMLElement,
  C extends Element
> = (parent: P, entries: readonly ChildResizeObserverEntry<C>[]) => void;

export function observeMutations(
  target: Node,
  mutationObserver: MutationObserver,
  options: MutationObserverInit
) {
  onMount(() => {
    mutationObserver.observe(target, options);
    onCleanup(() => mutationObserver.disconnect());
  });
}

function example(parent: HTMLPhysicsSimulationElement) {
  createChildSizeMutationObserver(
    parent,
    Element,
    { box: "border-box" },
    (parent, entries) => {
      console.log(parent, entries);
      for (const entry of entries) {
        const borderBoxSize = entry.borderBoxSize[0];
        parent.diameter = Math.max(
          parent.diameter,
          Math.hypot(borderBoxSize.blockSize, borderBoxSize.inlineSize)
        );
      }
    }
  );
}

// TODO move into a different folder+file
export function createChildSizeMutationObserver<
  P extends HTMLElement,
  C extends Element
>(
  parent: P,
  childElementType: TypeConstructor<C>,
  resizeObserverOptions: ResizeObserverOptions,
  callback: ChildResizeObserverCallback<P, C>
): MutationObserver {
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target.parentElement !== parent) {
        const msg =
          "ResizeObserverCallback called on removed child before the parent's MutationCallback";
        console.log(msg, parent, entry.target);
        throw msg;
      }
      if (!(entry.target instanceof childElementType)) {
        const msg = "ResizeObserverCallback called on child of the wrong type";
        console.log(msg, parent, entry.target, childElementType);
        throw msg;
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
