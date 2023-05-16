import {
  Vector2D,
  X,
  Y,
  vectorBetween,
  vectorLength,
  vectorTimes,
} from "../math/Vectors";
import { RollingAverage } from "../math/Stats";
import { assert } from "../development/Errors";
import { clamp } from "../math/Numbers";
import { PhysicsElement } from "../math/Physics";
import { PhysicsSimulationElementState } from "../math/PhysicsSimulation";

interface IntoDraggable extends HTMLElement {
  localScale: number;
  center: Readonly<Vector2D>;
  velocity: Readonly<Vector2D>;
  readonly state: PhysicsSimulationElementState;
}

// TODO other elements should be draggable too, unless we want to wrap every other draggable element in a sort of "bubble" when dragging them? Alternatively we can add another class like DraggableElement in the hierarchy between PhysicsSimulationElement and HTMLElement.
export function makeDraggableAndZoomable(element: IntoDraggable) {
  element.classList.add("transformable");
  const pointerEventListeners: [keyof PointerEventMap, PointerEventListener][] =
    [];
  const elementState: ElementState = {
    element,
    pointers: [],
    pointerEventListeners,
    handleExternalMovement,
  };
  const pointerUpOrCancel = onPointerUpOrCancel.bind(elementState);
  const pointerMove = onPointerMove.bind(elementState);
  function handleExternalMovement() {
    const [primary] = elementState.pointers;
    if (primary !== undefined) {
      pointerMove(primary.mostRecentEvent); // The user didn't move the pointer, but the element or one of its ancestors may have moved/zoomed, which affects the pointer's relative position.
    }
  }

  // TODO!! add pointerenter and focus events to implement element.state.position = "focused"

  pointerEventListeners.push(
    ["pointermove", pointerMove],
    ["pointerup", pointerUpOrCancel],
    ["pointercancel", pointerUpOrCancel],
  );
  element.addEventListener("pointerdown", onPointerDown.bind(elementState));
  element.addEventListener("wheel", onWheelEvent.bind(elementState));
}

type ElementState = {
  element: IntoDraggable;
  pointers: [] | [PointerState] | [PointerState, PointerState];
  readonly pointerEventListeners: ReadonlyArray<
    [keyof PointerEventMap, PointerEventListener]
  >;
  // Called when external movement happens (e.g. scroll or zoom) that may affect the element position
  readonly handleExternalMovement: (event: Event) => void;
};

type PointerState = {
  readonly pointerId: number;
  // TODO we need to store the initial scale as well because we want to recover the offset in *css* pixels: we want to preserve the pointer's position no matter how much it scales.
  // TODO!! Store the position as a Vector2D of *percents* rather than CSS pixels: we want the cursor to stay over the same relative spot on the element regardless of how big it is (and that includes not just css scale but also nodes getting added/removed as we zoom in/out)
  readonly initialOffset: Readonly<Vector2D>; // client pixels
  readonly initialScaleFactor: number; // css pixels / client pixels (TODO might be different for second pointer)
  readonly velocityX: RollingAverage; // TODO should these be properties of the element rather than the pointers?
  readonly velocityY: RollingAverage;
  mostRecentEvent: PointerEvent;
};

interface PointerEventMap {
  pointermove: PointerEvent;
  pointerup: PointerEvent;
  pointercancel: PointerEvent;
}

type PointerEventListener = (this: HTMLElement, ev: PointerEvent) => any;

// TODO!! this feels a bit weird when the simulation is playing: on every wheel movement the simulation gets played and everything moves, including the element we just zoomed.
// Maybe pin elements on mousenter?
function onWheelEvent(this: ElementState, event: WheelEvent) {
  if (!event.ctrlKey) {
    // TODO set the cursor to a zoom icon when the control key is pressed over a zoomable element!
    return; // Allow default scroll behavior: normal scroll up and down, and shift+scroll left and right
  }
  event.preventDefault();
  event.stopPropagation();

  const scaleDelta = clamp(-20, event.deltaY, 20) * -0.01;
  const scaleFactor = 1.0 + scaleDelta;

  const { element } = this;

  // TODO don't allow small elements to go below 0.1, and allow huge elements to go down to 0.001 (and so on).
  const newScale = clamp(0.01, element.localScale * scaleFactor, 100); // TODO combine with the other clamp

  // TODO!! this doesn't integrate super well with physics-based containers like modules and can cause explosive movement. Debugging needed to figure out why the maxVelocity doesn't stop that, but either way we should have another position state like "temporarily pinned" or "hovered" that prevents movement while elements are under the mouse?

  console.log("onWheelEvent", element.state);
  // TODO!! instead of doing all this math on the container element, use the initial event target (i.e. the deepest+smallest node that is under the pointer). That should fix issues with the parent element's scale not matching its css transform.
  // Also that way, as nodes get added/removed when zooming in/out, we can keep adjusting the "target" as needed: if the "target" is removed, jump to its parent. If a new node is added right under the pointer, make that the new "target".
  if (element.state !== "pinned") {
    // TODO figure this out:
    const actualScaleFactor = newScale / element.localScale;
    // offset = mouse - topLeft
    // newOffset = mouse - newTopLeft
    // newTopLeft = mouse - newOffset
    const mousePosition = pointerPosition(event);
    const currentOffset = vectorBetween(getTopLeft(element), mousePosition);
    const newOffset = vectorTimes(currentOffset, actualScaleFactor);
    const newPosition = vectorBetween(newOffset, mousePosition);
    element.localScale = newScale;
    // TODO the order matters here and relies on getBoundingClientRect() updating before and after the localScale changes. This is error-prone, inefficient, and needs a fix.
    setTopLeft(element, newPosition);
  }
  element.localScale = newScale;

  this.handleExternalMovement(event);
}

function addListeners(
  htmlElement: HTMLElement,
  event: PointerEvent,
  elementState: ElementState,
) {
  for (const [eventName, listener] of elementState.pointerEventListeners) {
    htmlElement.addEventListener(eventName, listener);
  }
  htmlElement.setPointerCapture(event.pointerId);

  forEachScrollableElementOrAncestor(htmlElement, (scrollable) =>
    scrollable.addEventListener("scroll", elementState.handleExternalMovement),
  );
}

function removeListeners(
  htmlElement: HTMLElement,
  event: PointerEvent,
  elementState: ElementState,
) {
  for (const [eventName, listener] of elementState.pointerEventListeners) {
    htmlElement.removeEventListener(eventName, listener);
  }
  htmlElement.releasePointerCapture(event.pointerId);
  forEachScrollableElementOrAncestor(htmlElement, (scrollable) =>
    scrollable.removeEventListener(
      "scroll",
      elementState.handleExternalMovement,
    ),
  );
}

function forEachScrollableElementOrAncestor(
  element: Element,
  callback: (scrollable: Element | Document) => void,
) {
  let scrollable: Element | null | undefined = element.closest(".scrollable");
  while (scrollable) {
    callback(scrollable);
    scrollable = scrollable.parentElement?.closest(".scrollable");
  }
  callback(document);
}

function onPointerDown(this: ElementState, event: PointerEvent) {
  const { element } = this;
  // if ((event.target as any) !== element) {
  //   // TODO check if useCapture prevents this
  //   console.info("Not dragging child of physics element", element, event);
  //   return;
  // }
  const [primary, secondary] = this.pointers;
  if (primary === undefined) {
    // first pointer down
    assert(
      element.state.position !== "dragging" &&
        element.state.scale !== "zooming",
      element.state,
    );
    event.stopPropagation();
    if (element.state.position === "free") {
      console.info("dragStart", event, this);
      element.state.position = "dragging";
    } else {
      assert(element.state.position === "pinned");
      console.info("Pinned element pressed", event, this);
      // TODO add a visual cue so users aren't confused as to why nothing is dragging
      element.state.scale = "pressed";
    }

    const offset = vectorBetween(getTopLeft(element), pointerPosition(event));
    const primary = initialPointerState(event, offset, getScaleFactor(element));
    this.pointers = [primary];
    addListeners(element, event, this);
  } else if (secondary === undefined) {
    // second pointer down
    assert(
      event.pointerId !== primary.pointerId,
      "Pointer down fired twice with same ID",
      this,
      event,
    );
    assert(
      element.state.position === "dragging" ||
        element.state.scale === "pressed",
      element.state,
      element,
    );

    event.stopPropagation();
    console.info("zoomStart", event, this);
    const offset = vectorBetween(
      pointerPosition(primary.mostRecentEvent),
      pointerPosition(event),
    );
    const secondary = initialPointerState(event, offset, element.localScale);
    this.pointers = [primary, secondary];
    element.state.scale = "zooming";
  }
}

function initialPointerState(
  event: PointerEvent,
  initialOffset: Readonly<Vector2D>,
  initialScaleFactor: number,
): PointerState {
  const rollingAverageSize = 5;
  return {
    pointerId: event.pointerId,
    initialOffset,
    initialScaleFactor,
    velocityX: new RollingAverage(rollingAverageSize),
    velocityY: new RollingAverage(rollingAverageSize),
    mostRecentEvent: event,
  };
}

function onPointerMove(this: ElementState, event: PointerEvent) {
  const {
    element,
    pointers: [primary, secondary],
  } = this;
  assert(primary !== undefined);
  assert(
    element.state.position === "dragging" ||
      element.state.scale === "pressed" ||
      element.state.scale === "zooming" ||
      secondary !== undefined,
    element.state,
    element,
    secondary,
  );

  console.debug(
    "onPointerMove",
    element.state,
    primary,
    secondary,
    event.pointerId,
  );

  // TODO!!! the zooming doesn't work well with mixed touch-screen+mouse pointers (at least on my pc): the mouse pointer will always follow one of the touch pointers and flicker back to it no matter how much I move the mouse. My laptop's built-in trackpad just deactivates when using the touchscreen.

  // TODO update position if state.position is not pinned

  if (event.pointerId === primary.pointerId) {
    if (secondary !== undefined) {
      assert(element.state.scale === "zooming");
      updateScale(element, event, secondary);
    }
    if (element.state.position === "dragging") {
      if (element.state.scale !== "zooming") {
        // TODO unbreak this: we want to update the position even when zooming
        updatePositionAndVelocity(element, event, primary);
      }
    }
    primary.mostRecentEvent = event;
    // TODO if element reaches the edge of the window while dragging, pan the window automatically
    // by applying a force to it. That way it speeds up over time
  }
  // TODO!! this works well for most cases but breaks down if a user zooms both an element and its parent at the same time
  if (secondary !== undefined && event.pointerId === secondary.pointerId) {
    assert(element.state.scale === "zooming");
    secondary.mostRecentEvent = event;
    updateScale(element, primary.mostRecentEvent, secondary);
    // TODO! Instead of trying to just keep the primary pointer in the same spot relative to the element, do that with the *mid-point between the two pointers*!
    //    Currently it feels weird to move the secondary pointer around
    if (element.state.position === "dragging") {
      // TODO unbreak this
      // updatePositionAndVelocity(element, primary.mostRecentEvent, primary);
    }
  }
}

function updateScale(
  element: IntoDraggable,
  event: MouseEvent,
  secondary: PointerState,
) {
  assert(element.state.scale === "zooming", element);
  const offset = vectorBetween(
    pointerPosition(event),
    pointerPosition(secondary.mostRecentEvent),
  );
  const distance = Math.max(1, vectorLength(offset));
  const initialDistance = Math.max(1, vectorLength(secondary.initialOffset));
  const initialScaleFactor = secondary.initialScaleFactor;

  const newScale = (initialScaleFactor * distance) / initialDistance;
  element.localScale = clamp(0.01, newScale, 100);
}

function onPointerUpOrCancel(this: ElementState, event: PointerEvent) {
  const { element, pointers } = this;
  const [primary, secondary] = pointers;
  assert(primary !== undefined);
  if (
    event.pointerId !== primary.pointerId &&
    event.pointerId !== secondary?.pointerId
  ) {
    return; // unrelated pointer
  }

  // TODO reverse these IF branches: it's less confusing if the last thing that happens goes last.
  if (secondary === undefined) {
    // last pointer up
    if (element.state.position === "dragging") {
      console.info("dragEnd", event, this);
      element.state.position = "free";
    }
    if (element.state.scale === "pressed") {
      console.info("Pinned element unpressed", event, this);
      element.state.scale = "fixed";
    }
    removeListeners(element, event, this);
    this.pointers = [];
    return;
  }
  // two pointers are still down.
  assert(element.state.scale === "zooming", element);
  console.info("zoomEnd", event, this);
  if (event.pointerId === primary.pointerId) {
    const position = pointerPosition(secondary.mostRecentEvent);
    const newPrimary: PointerState = {
      ...secondary,
      initialOffset: vectorBetween(getTopLeft(element), position),
      initialScaleFactor: getScaleFactor(element),
    };
    this.pointers = [newPrimary];
  } else if (event.pointerId === secondary.pointerId) {
    this.pointers = [primary];
  }
  if (element.state.position === "pinned") {
    element.state.scale = "pressed";
  } else {
    assert(element.state.position === "dragging", element.state);
    element.state.scale = "fixed";
  }
}

// returns css pixels / client pixels
function getScaleFactor(element: HTMLElement): number {
  return (
    Math.max(0.1, element.offsetWidth) /
    Math.max(0.1, element.getBoundingClientRect().width)
  );
}

function updatePositionAndVelocity(
  element: IntoDraggable,
  event: MouseEvent,
  pointerState: PointerState,
) {
  const scaleFactor = getScaleFactor(element); // element css pixels / client pixels

  const newPosition = vectorBetween(
    vectorTimes(
      pointerState.initialOffset,
      pointerState.initialScaleFactor / scaleFactor,
    ),
    pointerPosition(event),
  );
  const distanceMoved = setTopLeft(element, newPosition);

  const deltaMillis = event.timeStamp - pointerState.mostRecentEvent.timeStamp;
  if (deltaMillis > 0) {
    const deltaMillisSafe = Math.max(1, deltaMillis);
    pointerState.velocityX.add(distanceMoved[X] / deltaMillisSafe);
    pointerState.velocityY.add(distanceMoved[Y] / deltaMillisSafe);
  }
  element.velocity = [
    pointerState.velocityX.average(),
    pointerState.velocityY.average(),
  ];
}

function pointerPosition(event: MouseEvent): Vector2D {
  return [event.clientX, event.clientY];
}

function getTopLeft(element: IntoDraggable): Vector2D {
  const box = element.getBoundingClientRect();
  return [box.left, box.top];
}

function setTopLeft(
  element: IntoDraggable,
  newTopLeft: Readonly<Vector2D>,
): Vector2D {
  const rectangle = element.getBoundingClientRect();
  const delta = vectorBetween([rectangle.left, rectangle.top], newTopLeft); // client pixels

  const parentElement = element.parentElement!;

  const scaleFactor = getScaleFactor(parentElement); // parent css pixels / client pixels

  const newCenter: Readonly<Vector2D> = [
    element.center[X] + delta[X] * scaleFactor,
    element.center[Y] + delta[Y] * scaleFactor,
  ];
  const distanceMoved = vectorBetween(element.center, newCenter);
  // TODO!! limit the max velocity (i.e. max distanceMoved/deltaMillis) so elements don't go flying offscreen
  element.center = newCenter;
  return distanceMoved;
}
