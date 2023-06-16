import { makeDraggableAndZoomable } from "../../drag-zoom-drop/DragZoomAndDropV2";
import { DragZoomAndDropProperties } from "../../drag-zoom-drop/_Types";
import { PhysicsSimulationElementState } from "../../math/PhysicsSimulation";
import { PhysicsSimulationElement } from "../../math/PhysicsSimulationV2";
import { Vector2D } from "../../math/Vectors";
import { HTMLPhysicsSimulationElement } from "./_Types";

const PHYSICS_DATA = Symbol("DustPhysicsData");
export function getOrInitializePhysicsData(
  borderElement: HTMLElement,
  contents: HTMLElement,
): DragZoomAndDropPhysicsData {
  const existingData = (borderElement as any)[PHYSICS_DATA];
  if (existingData) {
    return existingData;
  }
  const newData = new DragZoomAndDropPhysicsData(borderElement, contents);
  (borderElement as any)[PHYSICS_DATA] = newData;
  makeDraggableAndZoomable(borderElement, { properties: newData });
  return newData;
}

export class DragZoomAndDropPhysicsData
  implements HTMLPhysicsSimulationElement, DragZoomAndDropProperties
{
  state: PhysicsSimulationElementState = "free";

  readonly borderElement: HTMLElement;
  readonly contents: HTMLElement;

  center: Readonly<Vector2D> = [0, 0];
  velocity: Readonly<Vector2D> = [0, 0];
  force: Vector2D = [0, 0];
  mass: number = 100; // TODO
  localScale: number = 1.0;

  constructor(borderElement: HTMLElement, contents: HTMLElement) {
    this.borderElement = borderElement;
    this.contents = contents;
  }

  get diameter(): number {
    return getElementDiameter(this.borderElement) * this.localScale;
  }
}

function getElementDiameter(element: HTMLElement) {
  if (element.classList.contains("circle")) {
    return element.offsetWidth;
  }
  return Math.hypot(element.offsetWidth, element.offsetHeight);
}
