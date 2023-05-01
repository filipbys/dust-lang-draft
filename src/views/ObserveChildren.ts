import { onCleanup, onMount } from "solid-js";
import {
  elementDiameter,
  Rectangle,
  rectangleDiameter,
} from "../math/Geometry";
import { HTMLPhysicsSimulationElement } from "../simulations/HTMLPhysicsSimulationElement";
import { TypeConstructor } from "../type-utils/DynamicTypeChecks";
import { logAndThrow } from "../development/Errors";

export type ChildrenResizeObserverCallback<
  P extends HTMLElement,
  C extends Element,
> = (parent: P, children: readonly C[]) => void;

export type UnobserveFunction = () => void;

// TODO move into a different folder+file
export function observeChildrenSizes<
  P extends HTMLElement,
  C extends HTMLElement,
>(
  parent: P,
  childElementType: TypeConstructor<C>,
  callback: ChildrenResizeObserverCallback<P, C>,
): UnobserveFunction {
  const observer = createChildrenSizeMutationObserver(
    parent,
    childElementType,
    callback,
  );

  observer.observe(parent, { childList: true });

  return observer.disconnect.bind(observer);
}

function createChildrenSizeMutationObserver<
  P extends HTMLElement,
  C extends HTMLElement,
>(
  parent: P,
  childElementType: TypeConstructor<C>,
  callback: ChildrenResizeObserverCallback<P, C>,
): MutationObserver {
  const getChild = (entry: ResizeObserverEntry): C => {
    const target = entry.target;
    if (target.parentElement !== parent) {
      logAndThrow(
        "ResizeObserverCallback called on removed child before the parent's MutationCallback",
        parent,
        target,
      );
    }
    if (!(target instanceof childElementType)) {
      logAndThrow(
        "ResizeObserverCallback called on child of the wrong type",
        parent,
        target,
        childElementType,
      );
    }
    return target;
  };

  const resizeObserver = new ResizeObserver((entries) => {
    console.log("ChildrenSizeMutationObserver.resizeObserver:", entries);
    callback(parent, entries.map(getChild));
  });

  const resizeObserverOptions: ResizeObserverOptions = { box: "border-box" };
  const observeIfNeeded = (node: Node) => {
    if (node instanceof childElementType) {
      resizeObserver.observe(node, resizeObserverOptions);
    }
  };

  const unobserveIfNeeded = (node: Node) => {
    if (node instanceof childElementType) {
      resizeObserver.unobserve(node);
    }
  };

  return new MutationObserver((mutations: MutationRecord[]) => {
    console.log("ChildrenSizeMutationObserver:", mutations);
    for (const mutation of mutations) {
      if (mutation.target !== parent) {
        logAndThrow(
          "MutationCallback called with the wrong target:",
          parent,
          mutation,
        );
      }
      if (mutation.type === "childList") {
        mutation.removedNodes.forEach(unobserveIfNeeded);
        mutation.addedNodes.forEach(observeIfNeeded);
      }
    }
  });
}

export type ChildResizeObserverEntry<T extends Element> =
  ResizeObserverEntry & {
    target: T;
  };

export type ChildResizeObserverCallback<
  P extends HTMLElement,
  C extends Element,
> = (parent: P, entries: readonly ChildResizeObserverEntry<C>[]) => void;

export function observeMutations(
  target: Node,
  mutationObserver: MutationObserver,
  options: MutationObserverInit,
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
          Math.hypot(borderBoxSize.blockSize, borderBoxSize.inlineSize),
        );
      }
    },
  );
}

function example2(parent: HTMLPhysicsSimulationElement) {
  createChildrenSizeMutationObserver(
    parent,
    HTMLElement,
    (parent, children) => {
      console.log(parent, children);
      for (const child of children) {
        parent.diameter = Math.max(parent.diameter, elementDiameter(child));
      }
    },
  );
}

// TODO move into a different folder+file
export function createChildSizeMutationObserver<
  P extends HTMLElement,
  C extends Element,
>(
  parent: P,
  childElementType: TypeConstructor<C>,
  resizeObserverOptions: ResizeObserverOptions, // TODO just pick one set of options and adjust ChildResizeObserverCallback and ChildResizeObserverEntry to match: give ChildResizeObserverCallback a list of all of the children's latest sizes each time any of them change. This is better because the ResizeObserver API is unclear about the best way to get the latest list of all the sizes. For now just give all the offsetWidth/Heights and then we can figure out how to be more efficient later.
  callback: ChildResizeObserverCallback<P, C>,
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
