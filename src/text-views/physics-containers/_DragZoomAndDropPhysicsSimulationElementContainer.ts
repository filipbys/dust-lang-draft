import { assert } from "../../development/Errors";
import {
  setCssCenter,
  setCssDiameter,
  setCssScale,
} from "../../html-custom-elements/CSSHelpers";
import { setAttributeIfChanged } from "../../html-custom-elements/ElementHelpers";
import { PhysicsElement, Springs } from "../../math/Physics";
import {
  PhysicsSimulationElement,
  PhysicsSimulationElementContainer,
  tryMove,
} from "../../math/PhysicsSimulationV2";
import { X, Y, vectorsEqual } from "../../math/Vectors";
import { assertIsInstance } from "../../type-utils/DynamicTypeChecks";
import { Edge, HTMLPhysicsSimulationElement } from "./_Types";
import {
  DragZoomAndDropPhysicsData,
  getOrInitializePhysicsData,
} from "./_DragZoomAndDropPhysicsData";

export interface EdgeData {
  readonly edges: readonly Edge[];
  readonly svgElement: SVGSVGElement;
}

export type ForceCalculator = (
  container: HTMLElement,
  elements: readonly HTMLPhysicsSimulationElement[],
) => void;

export class DragZoomAndDropPhysicsSimulationElementContainer
  implements
    PhysicsSimulationElementContainer<readonly DragZoomAndDropPhysicsData[]>
{
  readonly #container: HTMLElement;
  readonly #getEdgeData: () => EdgeData | null;
  readonly #updateCustomForces?: ForceCalculator;

  constructor(
    container: HTMLElement,
    getEdgeData: () => EdgeData | null,
    updateCustomForces?: ForceCalculator,
  ) {
    this.#container = container;
    this.#getEdgeData = getEdgeData;
    this.#updateCustomForces = updateCustomForces;
  }

  getPhysicsElements(): readonly DragZoomAndDropPhysicsData[] {
    const physicsElements: DragZoomAndDropPhysicsData[] = [];
    let borderElement = this.#container.firstElementChild;
    while (borderElement) {
      assertIsInstance(borderElement, HTMLDivElement);
      assert(borderElement.matches(".physicsElementBoundary"), borderElement);
      const contents = borderElement.nextElementSibling;
      assertIsInstance(contents, HTMLElement);
      physicsElements.push(getOrInitializePhysicsData(borderElement, contents));
      borderElement = contents.nextElementSibling;
    }
    return physicsElements;
  }

  updateForces(elements: readonly DragZoomAndDropPhysicsData[]): void {
    if (this.#container.classList.contains("circle")) {
      const containerBoundaryPhysicsElement: PhysicsElement = {
        diameter: this.#container.offsetWidth,
        center: [0, 0],
        velocity: [0, 0],
        force: [0, 0],
        mass: 100, // TODO sum of the elements
      };
      for (const element of elements) {
        Springs.keepWithin(element, containerBoundaryPhysicsElement, 0.1, 0); // TODO
      }
    } else {
      // TODO keep all the elements within the rectangle.
    }
    const edges = this.#getEdgeData()?.edges;
    if (edges) {
      for (const [fromIndex, toIndex] of edges) {
        // TODO
        Springs.connectBorders(elements[fromIndex], elements[toIndex], 0.1, 20);
      }
    }
    this.#updateCustomForces?.(this.#container, elements);
  }
  updateContainer(elements: readonly DragZoomAndDropPhysicsData[]): void {
    // TODO update the container's diameter.
    let boundary = this.#container.firstElementChild;
    for (const element of elements) {
      assertIsInstance(boundary, HTMLDivElement);
      assert(boundary.matches(".physicsElementBoundary"), boundary);
      const textNodeElement = boundary.nextElementSibling;
      assertIsInstance(textNodeElement, HTMLElement);

      setCssCenter(boundary, element.center);
      setCssCenter(textNodeElement, element.center);

      setCssDiameter(boundary, element.diameter * element.localScale);
      setCssScale(textNodeElement, element.localScale);

      boundary = textNodeElement.nextElementSibling;
    }

    const edgeData = this.#getEdgeData();
    if (edgeData) {
      const { edges, svgElement } = edgeData;
      let line = svgElement.firstChild;

      for (const [fromIndex, toIndex] of edges) {
        assertIsInstance(line, SVGLineElement);

        const from = elements[fromIndex];
        const to = elements[toIndex];

        setAttributeIfChanged(line, "x1", from.center[X].toString());
        setAttributeIfChanged(line, "y1", from.center[Y].toString());
        setAttributeIfChanged(line, "x2", to.center[X].toString());
        setAttributeIfChanged(line, "y2", to.center[Y].toString());

        line = line.nextSibling;
      }
    }
  }
}
