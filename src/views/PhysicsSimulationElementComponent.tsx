import {
  Accessor,
  Component,
  createEffect,
  For,
  JSX,
  on,
  onCleanup,
  ParentProps,
} from "solid-js";
import {
  addElementIfAbsent,
  removeElementIfPresent,
} from "../data-structures/Arrays";
import { Vector2D, X, Y } from "../math/Vectors";
import { setDiameter, setTranslate } from "../simulations/HTMLHelpers";
import { PhysicsSimulationElement } from "../simulations/PhysicsSimulationV2";

interface BubbleProps extends PhysicsSimulationElement {
  element: JSX.Element;
  allSimulationElements: PhysicsSimulationElement[];
  centeredWithinParent?: boolean;
}

export const Bubble: Component<BubbleProps> = (props) => {
  function mountElement(bubble: HTMLDivElement) {
    addElementIfAbsent(props.allSimulationElements, props, "Bubble");
    const previousCssTranslate: Vector2D = [0, 0];
    createEffect(() => {
      setDiameter(bubble, props.diameter, props.centeredWithinParent);
      setTranslate(bubble, props.center, previousCssTranslate);
    });
    onCleanup(() => {
      removeElementIfPresent(props.allSimulationElements, props, "Bubble");
    });
  }

  return (
    <div class="Dust physicsSimulationElement bubble" ref={mountElement}>
      {props.element}
    </div>
  );
};

interface CollectionProps extends PhysicsSimulationElement {
  children: JSX.Element[];
  allSimulationElements: PhysicsSimulationElement[];
  centeredWithinParent?: boolean;
}

// TODO a custom HTML element would still be useful even here: we wouldn't need to maintain the mutable allElements list, and it would make it easier for Collections to track their direct children for frameCallbacks
export const Collection: Component<CollectionProps> = (props) => {
  function mountElement(collection: HTMLDivElement) {
    addElementIfAbsent(props.allSimulationElements, props, "Collection");
    const previousCssTranslate: Vector2D = [0, 0];
    createEffect(() => {
      setDiameter(collection, props.diameter, props.centeredWithinParent);
      setTranslate(collection, props.center, previousCssTranslate);
    });
    onCleanup(() => {
      removeElementIfPresent(props.allSimulationElements, props, "Collection");
    });
  }

  return (
    <div class="Dust physicsSimulationElement collection" ref={mountElement}>
      <For each={props.children}>{(child) => <Bubble />}</For>
    </div>
  );
};
