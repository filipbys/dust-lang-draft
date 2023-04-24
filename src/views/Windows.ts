import { elementDiameter, smallestEnclosingCircle } from "../math/Geometry";
import { PhysicsElement } from "../math/Physics";
import { makeDraggable } from "../simulations/DragAndDrop";
import { createSignal } from "solid-js";

type WindowContents = {
  readonly htmlElement: HTMLDivElement;
  readonly elements: PhysicsElement[];
};

type DustWindow = {
  readonly htmlElement: HTMLDivElement;
  readonly windowContents: WindowContents;
  zoomLevel: number; // percentage passed directly to transform: scale
};

function makeWindowContents(htmlElements: HTMLElement[]): WindowContents {
  const windowContents = DustDOM.div({ className: "windowContents" }, []);

  const elements: PhysicsElement[] = [];

  const windowContentsPhysicsElement = new PhysicsElement({
    htmlElement: windowContents,
    state: "pinned",
    diameter: 100,
  });

  function encircleWindowContents(): "proceed" {
    const boundary = smallestEnclosingCircle(elements);
    windowContentsPhysicsElement.setBoundary(boundary);
    return "proceed";
  }

  // TODO for tests use https://stackoverflow.com/questions/64558062/how-to-mock-resizeobserver-to-work-in-unit-tests-using-react-testing-library
  const resizeObserver = new ResizeObserver((entries) => {
    console.log("DustWindows resizeObserver:", entries);
    for (const entry of entries) {
      const windowElement = entry.target.parentElement;
      const borderBox = entry.borderBoxSize[0];
      // TODO need to recover the PhysicsElement.
      // May need to use customelements after all :(
      //  -> that would allow us to write entry.target.parentElement as PhysicsElement
      // for now we have to brute force (or use a hashmap):
      for (const physicsElement of elements) {
        if (physicsElement.htmlElement === windowElement) {
          physicsElement.diameter = Math.hypot(
            borderBox.blockSize,
            borderBox.inlineSize
          );
        }
      }
    }
  });

  for (const htmlElement of htmlElements) {
    const windowElement = DustDOM.div({ className: "windowElement" }, [
      htmlElement,
    ]);

    windowContents.appendChild(windowElement);

    console.log(
      "makeWindowContents, element:",
      htmlElement,
      htmlElement.clientWidth,
      htmlElement.clientHeight
    );
    const physicsElement = new PhysicsElement({
      htmlElement: windowElement,
      state: "free",
      diameter: elementDiameter(htmlElement),
    });

    // TODO unobserve if the element is removed from the window
    resizeObserver.observe(htmlElement, { box: "border-box" });

    // TODO need some kind of callback so we can update the windowContents div
    makeDraggable(physicsElement);
    elements.push(physicsElement);
  }

  // TODO need to call this every frame
  encircleWindowContents();

  // TODO resizeObserver.disconnect()
  return {
    htmlElement: windowContents,
    elements,
  };
}

export function createWindow(htmlElements: HTMLElement[]): DustWindow {
  const windowContents = makeWindowContents(htmlElements);

  // TODO gesture and mousewheel-based zooming
  // TODO when possible, make the window's center the zoom origin: use scrollTo
  const zoomAmount = 10;
  let currentZoomLevel = createSignal(100);

  customElements.upgrade;

  // TODO this looks like proof that we need to use a framework like Solid
  const window: DustWindow = {
    htmlElement: DustDOM.div({ className: "window" }, [
      // TODO toolbar shouldn't scroll. May need to put it outside the bounding box
      DustDOM.div({ className: "windowToolbar" }, [
        DustDOM.button(
          { onClick: () => (window.zoomLevel += zoomAmount) },
          "zoom in"
        ),
        DustDOM.button(
          { onClick: () => (window.zoomLevel -= zoomAmount) },
          "zoom out"
        ),

        DustDOM.input<number>({ type: "number" }, currentZoomLevel),
        // TODO buttons/menu to add a new element

        // TODO button to zoom out until entire windowContent is in view

        // TODO play/pause/runOneStep buttons for the physics simulation
      ]),
      DustDOM.div({ className: "windowContentArea" }, [
        windowContents.htmlElement,
      ]),
      // TODO add a minimap view that always shows the whole project and a little highlighted rectangle to show users where they're currently zoomed in
    ]),
    windowContents,
    get zoomLevel() {
      return currentZoomLevel.value;
    },
    set zoomLevel(level) {
      currentZoomLevel.value = Math.max(0.1, level);
      // TODO show/hide elements: https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/hidden
      windowContents.htmlElement.style.transform = `scale(${currentZoomLevel.value}%)`;
    },
  };

  return window;
}
