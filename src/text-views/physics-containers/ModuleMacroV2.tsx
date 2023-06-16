import { For, Match, Show, Switch, createMemo, onMount } from "solid-js";
import { assert } from "../../development/Errors";
import { PhysicsElement, Springs } from "../../math/Physics";
import { TextGroup, asLeaf, isGroup, isNotBlank } from "../../text/TextTree";
import { BubbleWrapper } from "../../views/BubbleWrapper";
import { IntoHTMLPhysicsSimulationComponent } from "../../views/HTMLPhysicsSimulationComponent";
import { getID } from "../Identifiers";
import { TextNodeEditor } from "../TextNodeEditor";
import { TextNodeEditorProps } from "../TextViewTypes";

import { tryMove } from "../../math/PhysicsSimulation";
import { X, Y, vectorsEqual } from "../../math/Vectors";
import "./Modules.css";
import { PhysicsContainer } from "./PhysicsContainer";
import { PhysicsSimulationElement } from "../../math/PhysicsSimulationV2";
import { HTMLPhysicsSimulationElement } from "./_Types";
import { preventCollisions } from "./Collisions";

// TODO!!!!!!
// Module elements can have links between each other (by name).
// Links are drawn visually as transparent lines (which can be hidden if desired) and they also attract the elements together.
// This can be either explicit via an optional third parameter in the TextGroup, or it can be automatic: the language can look up the names used by each element and draw a link to those names' definitions.
// Automatic name-based links can be turned on/off but not individually severed by the user, whereas explicit user-defined links can be created and broken by the user:
//  - Elements normally repel each other, but if pushed close enough together, a link is created between them that holds them together (they're still repelled so the link is like a taut string).
//    - Links can also be created explicitly using a toolbar cursor mode.
//  - These links have a maximum force they can withstand: dragging an element gently will pull linked elements with it, but dragging it more forcefully will break the link.
//    - The user can also always explicitly select and delete user-defined links.
export function ModuleMacro(props: TextNodeEditorProps<TextGroup>) {
  const nonBlankNodes = createMemo(() => props.node.nodes.filter(isNotBlank));

  const moduleName = () => nonBlankNodes().at(1);

  return (
    <PhysicsContainer
      id={getID(ModuleMacro, props)}
      classList={props.classList}
      shape="circle"
      updateCustomForces={updateModuleForces}
    >
      <Show when={moduleName()}>
        {(moduleName) => (
          <TextNodeEditor
            {...props}
            classList={{ centeredWithinParent: true }}
            jsonPointer={
              props.jsonPointer +
              "/nodes/" +
              props.node.nodes.indexOf(moduleName())
            }
            node={moduleName()}
            depthLimit={props.depthLimit - 1}
          />
        )}
      </Show>
      <Switch>
        <Match when={nonBlankNodes().length !== 4}>
          Error: module must have 3 parameters, e.g. (module MyModule [] [])
        </Match>
        <Match when={nonBlankNodes().length === 4}>
          <For each={nonBlankNodes().slice(2)}>
            {(node, index) => (
              <Show
                when={isGroup(node) && node.groupType === "[]"}
                fallback={
                  <span class="Dust errorMessage centeredWithinParent">
                    Error: module parameters must be arrays, e.g. (module
                    MyModule [] [])
                  </span>
                  // TODO support function names e.g. (module MyModule (public = []) (private = []))
                }
              >
                <ModuleElementList
                  {...props}
                  jsonPointer={
                    props.jsonPointer +
                    "/nodes/" +
                    props.node.nodes.indexOf(node)
                  }
                  node={node as TextGroup}
                  depthLimit={props.depthLimit - 1}
                  visibility={index() === 0 ? "public" : "private"}
                />
              </Show>
            )}
          </For>
        </Match>
      </Switch>
    </PhysicsContainer>
  );
}

function ModuleElementList(
  props: TextNodeEditorProps<TextGroup> & {
    visibility: "public" | "private";
  },
) {
  return (
    <For each={props.node.nodes}>
      {(node, index) => (
        <Show when={isNotBlank(node)}>
          <TextNodeEditor
            {...props}
            classList={{ centeredWithinParent: true, [props.visibility]: true }}
            jsonPointer={props.jsonPointer + "/nodes/" + index()}
            node={node}
            depthLimit={props.depthLimit - 1}
          />
        </Show>
      )}
    </For>
  );
}

function updateModuleForces(
  moduleElement: HTMLElement,
  physicsElements: readonly HTMLPhysicsSimulationElement[],
) {
  // TODO return early if simulation is not playing locally.

  // TODO:
  // - gently repel elements that are >= X distance appart
  // - gently attract elements that are < X distance appart

  // const smallestDiameter =
  //   approximateSmallestEnclosingCircle(physicsElements).diameter;

  // if (this.offsetDiameter < smallestDiameter) {
  //   this.offsetDiameter = smallestDiameter;
  // }

  // TODO fix this hack
  const boundaryElement: PhysicsElement = {
    diameter: moduleElement.offsetWidth,
    center: [0, 0],
    velocity: [0, 0],
    force: [0, 0],
    mass: physicsElements.reduce((total, element) => total + element.mass, 0), // TODO! this.mass should be that already
  };

  updateForces(boundaryElement, physicsElements);
}

// TODO this is still super broken.
function updateForces(
  boundaryElement: Readonly<PhysicsElement>,
  physicsElements: readonly HTMLPhysicsSimulationElement[],
) {
  const idealGapBetweenElements = 20;

  const collisionSpringConstant = 0.05; // 1/(millis^2): strongly repel colliding elements

  const spreadSpringConstant = 0.0005; // gently spread all elements away from all others

  const publicElementsToBorderSpringConstant = collisionSpringConstant / 2; // Strongly pull towards the module's border
  const privateElementsToCenterSpringConstant = collisionSpringConstant / 8; // Relatively strongly pull towards the center

  preventCollisions(physicsElements);
  // TODO connect adjacent elements with weak springs so they tend towards a ring.
  // Update the order of the elements when the user drags an element and changes the order by checking which two elements of the same visibility are closest and ensuring that it is between those two elements in the list
  for (const element of physicsElements) {
    if (element.contents.classList.contains("public")) {
      Springs.connectBorders(
        element,
        boundaryElement,
        publicElementsToBorderSpringConstant,
        -element.diameter,
      );
    } else {
      // TODO try Springs.connectCenters(element.diameter/2) instead
      Springs.connectBorders(
        element,
        boundaryElement,
        privateElementsToCenterSpringConstant,
        (element.diameter - boundaryElement.diameter) / 2,
      );
    }
  }

  for (let i = 0; i < physicsElements.length; i++) {
    const first = physicsElements[i];
    for (let j = i + 1; j < physicsElements.length; j++) {
      const second = physicsElements[j];
      if (vectorsEqual(first.center, second.center)) {
        tryMove(first, [first.center[X] - 1, first.center[Y]]);
        tryMove(second, [second.center[X] + 1, second.center[Y]]);
      }
      const gap = Springs.preventCollisions(
        first,
        second,
        collisionSpringConstant,
        idealGapBetweenElements,
      );
      // TODO try a constant force rather than a spring
      Springs.connectCenters(
        first,
        second,
        gap < idealGapBetweenElements * 2
          ? -spreadSpringConstant
          : spreadSpringConstant,
        boundaryElement.diameter,
      );
    }
  }

  // TODO calculate average overlap between elements, as well as average distance of public/private elements to border

  // TODO use these to grow/shrink the module automatically
  // TODO calculate module area and compare it to sum of element areas

  // TODO use average distance of public elements to border to grow/shrink the module
  // also grow the module if any private elements end up touching the border
}
