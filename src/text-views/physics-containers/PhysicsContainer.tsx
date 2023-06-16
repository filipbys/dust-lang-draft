import {
  For,
  ParentProps,
  Show,
  children,
  mergeProps,
  onMount,
} from "solid-js";
import { raise } from "../../development/Errors";
import { setCssDiameter } from "../../html-custom-elements/CSSHelpers";
import { PhysicsConstants } from "../../math/Physics";
import { PhysicsSimulationElement } from "../../math/PhysicsSimulation";
import {
  PhysicsSimulation,
  createSimulation,
} from "../../math/PhysicsSimulationV2";
import { isNotBlank } from "../../text/TextTree";
import { getID } from "../Identifiers";
import { TextNodeEditor } from "../TextNodeEditor";
import {
  DragZoomAndDropPhysicsSimulationElementContainer,
  ForceCalculator,
} from "./_DragZoomAndDropPhysicsSimulationElementContainer";
import { Edge } from "./_Types";

export function PhysicsContainer(
  props: ParentProps & {
    id: string;
    classList?: {
      [k: string]: boolean | undefined;
    };
    edges?: readonly Edge[];
    shape: "circle" | "rectangle";
    centeredWithinParent?: boolean;
    updateCustomForces?: ForceCalculator;
  },
) {
  let container: HTMLDivElement;
  let containerSVG: SVGSVGElement | null = null;

  onMount(() => {
    setCssDiameter(container, 1000); // TODO update dynamically based on internal pressure from the children
    initializePhysicsContainer(
      container,
      new DragZoomAndDropPhysicsSimulationElementContainer(
        container,
        () =>
          props.edges
            ? { edges: props.edges, svgElement: containerSVG! }
            : null,
        props.updateCustomForces,
      ),
    );
  });

  const resolvedChildren = children(() => props.children);

  return (
    <div
      id={props.id}
      ref={container!}
      classList={mergeProps(props.classList, {
        Dust: true,
        [PHYSICS_CONTAINER_CLASS_NAME]: true,
        [props.shape]: true,
        centeredWithinParent: props.centeredWithinParent,
      })}
    >
      <For each={resolvedChildren.toArray()}>
        {(child) => (
          <>
            <div class="Dust physicsElementBoundary circle centeredWithinParent"></div>
            {child}
          </>
        )}
      </For>

      {/* TODO show error when any edge is invalid. */}
      <Show when={props.edges}>
        <svg
          ref={containerSVG!}
          class="Dust containerSVG"
          width="100%"
          height="100%"
        >
          <For each={props.edges}>
            {() => <line class="Dust containerEdge" stroke="black" />}
          </For>
        </svg>
      </Show>
    </div>
  );
}

export function setUpSimulation(
  physicsConstants: PhysicsConstants,
): PhysicsSimulation {
  const activeContainers = document.getElementsByClassName(
    `Dust ${PHYSICS_CONTAINER_CLASS_NAME}`,
  );
  return createSimulation({
    physicsConstants,
    getActiveContainers() {
      return Array.from(activeContainers).map(getPhysicsContainerData);
    },
    onAutoPause() {
      // TODO
    },
  });
}

const PHYSICS_CONTAINER_DATA = Symbol("DustPhysicsElementContainerData");
const PHYSICS_CONTAINER_CLASS_NAME = "physicsElementContainer";

function initializePhysicsContainer(
  element: Element,
  data: DragZoomAndDropPhysicsSimulationElementContainer,
) {
  (element as any)[PHYSICS_CONTAINER_DATA] = data;
}

function getPhysicsContainerData(
  element: Element,
): DragZoomAndDropPhysicsSimulationElementContainer {
  return (
    (element as any)[PHYSICS_CONTAINER_DATA] ??
    raise(`${PHYSICS_CONTAINER_DATA.description} was not set`)
  );
}
