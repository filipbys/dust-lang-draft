import {
  TypeConstructor,
  assertIsInstance,
} from "../type-utils/DynamicTypeChecks";
import { logAndThrow } from "../development/Errors";

export type ChildrenResizeObserverCallback<
  P extends HTMLElement,
  C extends Element,
> = (parent: P, resizedChildren: readonly C[]) => void;

export type UnobserveFunction = () => void;

export function observeChildrenSizes<
  P extends HTMLElement,
  C extends HTMLElement,
>(
  parent: P,
  childElementType: TypeConstructor<C>,
  callback: ChildrenResizeObserverCallback<P, C>,
): UnobserveFunction {
  const getChild = (entry: ResizeObserverEntry) =>
    getTargetAsChild(parent, childElementType, entry);

  const resizeObserver = new ResizeObserver((entries) => {
    callback(parent, entries.map(getChild));
  });

  const mutationObserver = new ChildSizeMutationObserver(
    parent,
    childElementType,
    resizeObserver,
  );
  parent.childNodes.forEach(mutationObserver.observeSizeIfNeeded);
  mutationObserver.observe(parent, { childList: true });
  return () => {
    resizeObserver.disconnect();
    mutationObserver.disconnect();
  };
}

type NodeCallback = (node: Node) => void;

class ChildSizeMutationObserver extends MutationObserver {
  readonly parent: HTMLElement;
  readonly observeSizeIfNeeded: NodeCallback;
  readonly unobserveSizeIfNeeded: NodeCallback;

  constructor(
    parent: HTMLElement,
    childElementType: TypeConstructor<Element>,
    resizeObserver: ResizeObserver,
  ) {
    super(processMutations as MutationCallback);
    this.parent = parent;

    const resizeObserverOptions: ResizeObserverOptions = { box: "border-box" };
    this.observeSizeIfNeeded = (node: Node) => {
      if (node instanceof childElementType) {
        resizeObserver.observe(node, resizeObserverOptions);
      }
    };
    this.unobserveSizeIfNeeded = (node: Node) => {
      if (node instanceof childElementType) {
        resizeObserver.unobserve(node);
      }
    };
  }
}

function processMutations(
  mutations: MutationRecord[],
  observer: ChildSizeMutationObserver,
) {
  for (const mutation of mutations) {
    if (mutation.target !== observer.parent) {
      const message = "MutationCallback called with the wrong target";
      logAndThrow(message, parent, mutation);
    }
    if (mutation.type === "childList") {
      mutation.removedNodes.forEach(observer.unobserveSizeIfNeeded);
      mutation.addedNodes.forEach(observer.observeSizeIfNeeded);
    }
  }
}

function getTargetAsChild<P, C>(
  parent: P,
  childElementType: TypeConstructor<C>,
  entry: ResizeObserverEntry,
): C {
  const target = entry.target;
  if (target.parentElement !== parent) {
    const message =
      "ResizeObserverCallback called on removed child before the parent's MutationCallback";
    logAndThrow(message, parent, target);
  }
  assertIsInstance(target, childElementType);
  return target;
}
