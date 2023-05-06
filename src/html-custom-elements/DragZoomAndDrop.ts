import { updateElementText } from "../development/Debugging";
import { Vector2D, X, Y, vectorBetween } from "../math/Vectors";
import { RollingAverage } from "../math/Stats";
import { HTMLPhysicsSimulationElement } from "./HTMLPhysicsSimulationElement";
import { assert } from "../development/Errors";
import { clamp } from "../math/Numbers";

// TODO other elements should be draggable too, unless we want to wrap every other draggable element in a sort of "bubble" when dragging them? Alternatively we can add another class like DraggableElement in the hierarchy between PhysicsSimulationElement and HTMLElement.
export function makeDraggableAndZoomable(
  element: HTMLPhysicsSimulationElement,
) {
  element.classList.add("transformable");
  element.addEventListener("pointerdown", (event) => dragStart(element, event));
  element.addEventListener("wheel", (event) => zoom(element, event));
}

function zoom(element: HTMLPhysicsSimulationElement, event: WheelEvent) {
  if (!event.ctrlKey) {
    // TODO set the cursor to a zoom icon when the control key is pressed over a zoomable element!
    return; // Allow default scroll behavior: normal scroll up and down, and shift+scroll left and right
  }
  event.preventDefault();
  event.stopPropagation();
  console.log(event.deltaY);

  const scaleDelta = clamp(-20, event.deltaY, 20) * -0.006;
  const scaleFactor = 1.0 + scaleDelta;
  // TODO don't allow small elements to go below 0.1, and allow huge elements to go down to 0.001 (and so on).
  element.scale = clamp(0.01, element.scale * scaleFactor, 100);
}

type PointerEventListener = (this: HTMLElement, ev: PointerEvent) => any;

type PointerState = {
  readonly pointerId: number;
  // TODO we need to store the initial scale as well because we want to recover the offset in *css* pixels: we want to preserve the pointer's position no matter how much it scales.
  readonly initialOffset: Readonly<Vector2D>; // client pixels
  readonly velocityX: RollingAverage;
  readonly velocityY: RollingAverage;
  previousEvent: PointerEvent;
};

interface PointerEventMap {
  pointerdown: PointerEvent;
  pointermove: PointerEvent;
  pointerup: PointerEvent;
  pointercancel: PointerEvent;
}

type ElementState = {
  pointers: [PointerState] | [PointerState, PointerState];
  readonly pointerEventListeners: ReadonlyArray<
    [keyof PointerEventMap, PointerEventListener]
  >;
  readonly onElementOrAncestorScroll: (event: Event) => void;
};

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
    scrollable.addEventListener(
      "scroll",
      elementState.onElementOrAncestorScroll,
    ),
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
      elementState.onElementOrAncestorScroll,
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

function dragStart(element: HTMLPhysicsSimulationElement, event: PointerEvent) {
  if (event.target !== element) {
    // TODO check if useCapture prevents this
    console.info("Not dragging child of physics element", element, event);
    return;
  }
  event.stopPropagation();
  if (element.state !== "free") {
    return;
  }
  console.info("dragStart", element, event);

  element.state = "dragging";

  const rollingAverageSize = 5;

  const elementState: ElementState = {
    pointers: [
      {
        pointerId: event.pointerId,
        // TODO store the initial scale as well.
        initialOffset: vectorBetween(
          getTopLeft(element),
          pointerPosition(event),
        ),
        velocityX: new RollingAverage(rollingAverageSize),
        velocityY: new RollingAverage(rollingAverageSize),
        previousEvent: event,
      },
    ],
    pointerEventListeners: [
      ["pointerdown", secondPointerDown],
      ["pointermove", pointerMove],
      ["pointerup", pointerUpOrCancel],
      ["pointercancel", pointerUpOrCancel],
    ],
    onElementOrAncestorScroll() {
      const [primary] = elementState.pointers;
      pointerMove(primary.previousEvent);
    },
  };
  function secondPointerDown(event: PointerEvent) {
    const [primary] = elementState.pointers;
    assert(
      event.pointerId !== primary.pointerId,
      "Pointer down fired twice with same ID",
      elementState,
      event,
    );
    if (elementState.pointers.length !== 1) {
      return;
    }
    const secondary: PointerState = {
      pointerId: event.pointerId,
      initialOffset: vectorBetween(
        pointerPosition(primary.previousEvent),
        pointerPosition(event),
      ),
      velocityX: new RollingAverage(rollingAverageSize),
      velocityY: new RollingAverage(rollingAverageSize),
      previousEvent: event,
    };
    elementState.pointers = [primary, secondary];
    element.state = "zooming";
  }
  function pointerMove(event: PointerEvent) {
    if (elementState.pointers.length === 1) {
      assert(element.state === "dragging", element);
      const [pointerState] = elementState.pointers;
      if (event.pointerId !== pointerState.pointerId) {
        return;
      }
      updatePositionAndVelocity(element, event, pointerState);
      // TODO if element reaches the edge of the window while dragging, pan the window automatically
      // by applying a force to it. That way it speeds up over time
      return;
    }
    assert(element.state === "zooming", element);
    const [primary, secondary] = elementState.pointers;

    if (
      event.pointerId !== primary.pointerId &&
      event.pointerId !== secondary.pointerId
    ) {
      return;
    }
    // TODO zoom
  }
  function pointerUpOrCancel(event: PointerEvent) {
    if (elementState.pointers.length === 1) {
      assert(element.state === "dragging", element);

      const [pointerState] = elementState.pointers;

      if (event.pointerId !== pointerState.pointerId) {
        return;
      }

      assert(event.target === element, element, event);
      console.info("dragEnd", element, event, pointerState);
      element.state = "free";
      removeListeners(element, event, elementState);
      updateElementText(element);
      return;
    }
    assert(element.state === "zooming", element);
    const [primary, secondary] = elementState.pointers;
    if (event.pointerId === primary.pointerId) {
      elementState.pointers = [secondary];
    } else if (event.pointerId === secondary.pointerId) {
      elementState.pointers = [primary];
    } else {
      return;
    }
    element.state = "dragging";
  }
  addListeners(element, event, elementState);
}

function updatePositionAndVelocity(
  element: HTMLPhysicsSimulationElement,
  event: PointerEvent,
  pointerState: PointerState,
) {
  const deltaMillis = event.timeStamp - pointerState.previousEvent.timeStamp;
  const deltaMillisSafe = Math.max(1, deltaMillis);
  pointerState.previousEvent = event;

  // TODO take into account scale: the pointerOffset might need to be adjusted if the current scale is not the same as when the dragging started.
  const newPosition = vectorBetween(
    pointerState.initialOffset,
    pointerPosition(event),
  );
  const distanceMoved = setTopLeft(element, newPosition);

  pointerState.velocityX.add(distanceMoved[X] / deltaMillisSafe);
  pointerState.velocityY.add(distanceMoved[Y] / deltaMillisSafe);
  element.velocity = [
    pointerState.velocityX.average(),
    pointerState.velocityY.average(),
  ];

  updateElementText(element);
}

function pointerPosition(event: PointerEvent): Vector2D {
  return [event.clientX, event.clientY];
}

function getTopLeft(element: HTMLPhysicsSimulationElement): Vector2D {
  const box = element.getBoundingClientRect();
  return [box.left, box.top];
}

function setTopLeft(
  element: HTMLPhysicsSimulationElement,
  newTopLeft: Readonly<Vector2D>,
): Vector2D {
  const box = element.getBoundingClientRect();
  const delta = vectorBetween([box.left, box.top], newTopLeft); // client pixels

  const parentElement = element.parentElement!;

  const parentBox = parentElement.getBoundingClientRect();
  const scaleFactor = parentElement.offsetWidth / parentBox.width; // css pixels / client pixels
  // console.log(scaleFactor, parentElement, element);

  const newCenter: Readonly<Vector2D> = [
    element.center[X] + delta[X] * scaleFactor,
    element.center[Y] + delta[Y] * scaleFactor,
  ];
  const distanceMoved = vectorBetween(element.center, newCenter);
  element.center = newCenter;
  return distanceMoved;
}

function zoomStart(
  element: HTMLPhysicsSimulationElement,
  event: PointerEvent,
) {}
