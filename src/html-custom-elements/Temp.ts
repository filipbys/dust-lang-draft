import { makeDraggableAndZoomable } from "../drag-zoom-drop/DragZoomAndDropV2";
import { DragZoomAndDropProperties } from "../drag-zoom-drop/_Types";
import { Circle, offsetDiameter } from "../math/Geometry";
import {
  PhysicsSimulationElement,
  PhysicsSimulationElementState,
} from "../math/PhysicsSimulation";
import { Vector2D, vectorsEqual } from "../math/Vectors";
import {
  setCssCenter,
  setCssDiameter,
  setCssDiameterLiteral,
  setCssScale,
} from "./CSSHelpers";

export interface DragZoomAndDropPhysicsElement
  extends PhysicsSimulationElement,
    DragZoomAndDropProperties {}

const DATA_KEY = Symbol(`DragZoomAndDropPhysicsSimulationElement`);
const CLASS: string = DATA_KEY.description!;

export interface HTMLDragZoomAndDropPhysicsElement extends HTMLElement {
  [DATA_KEY]: DragZoomAndDropPhysicsElement;
}

export interface InitialDragZoomAndDropPhysicsData {
  simulationFrameCallback?(): void;
  state?: PhysicsSimulationElementState;
}

export function initializeDragZoomAndDropPhysicsElement(
  boundary: HTMLElement | SVGElement,
  element: SupportedElement,
  getElementDiameter: () => number,

  data: InitialDragZoomAndDropPhysicsData,
): DragZoomAndDropPhysicsElement {
  element.classList.add(CLASS);
  const physicsElement = new DragZoomAndDropPhysicsElementData(
    boundary,
    element,
    getElementDiameter,
    data,
  );
  (element as any)[DATA_KEY] = physicsElement;
  makeDraggableAndZoomable(boundary, { properties: physicsElement });
  return physicsElement;
}

export function hasDragZoomAndDropPhysicsElement(
  element: HTMLElement,
): element is HTMLDragZoomAndDropPhysicsElement {
  return DATA_KEY in element;
}

export function getDragZoomAndDropPhysicsElement(
  element: HTMLDragZoomAndDropPhysicsElement,
): PhysicsSimulationElement {
  return element[DATA_KEY];
}

interface SupportedElement extends Element, ElementCSSInlineStyle {}

class DragZoomAndDropPhysicsElementData
  implements DragZoomAndDropPhysicsElement
{
  constructor(
    boundary: SupportedElement,
    element: SupportedElement,
    getElementDiameter: () => number,
    {
      simulationFrameCallback,
      state = "pinned",
    }: InitialDragZoomAndDropPhysicsData,
  ) {
    this.#boundary = boundary;
    this.#element = element;
    this.#getElementDiameter = getElementDiameter;
    this.simulationFrameCallback = () => {
      this.#updateCssProperties();
      simulationFrameCallback?.();
    };
    this.state = state;
    this.#updateCssProperties();
  }

  readonly #boundary: SupportedElement;
  readonly #element: SupportedElement;
  readonly #getElementDiameter: () => number;
  readonly simulationFrameCallback: () => void;

  state: PhysicsSimulationElementState;

  public get diameter(): number {
    return this.#getElementDiameter() * this.localScale;
  }

  center: Readonly<Vector2D> = [0, 0];
  velocity: Readonly<Vector2D> = [0, 0];
  public readonly force: Vector2D = [0, 0];
  mass: number = 100; // TODO

  localScale: number = 1.0;

  #updateCssProperties() {
    setCssCenter(this.#boundary, this.center);
    if (this.#element.parentNode !== this.#boundary) {
      setCssCenter(this.#element, this.center);
    }

    setCssScale(this.#element, this.localScale);
    setCssDiameter(
      this.#boundary,
      this.#getElementDiameter() * this.localScale,
    );
  }
}
