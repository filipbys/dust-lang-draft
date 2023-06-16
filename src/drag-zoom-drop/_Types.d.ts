import { RollingAverage } from "../math/Stats";
import { Vector2D } from "../math/Vectors";

/**
 * Only HTMLElements are supported for now because we append pointer
 * marker elements to the draggable element. In principle SVGElements
 * could also be supported but the pointer markers would have to be
 * added somewhere else.
 */
export type SupportedElement = HTMLElement;

export interface ElementState {
  readonly config: DragZoomAndDropConfig;
  data: ElementStateData;
}

export interface DragZoomAndDropConfig {
  readonly properties: DragZoomAndDropProperties;
  readonly positionMarkerDiameter?: string; // any valid css size
  readonly zoomPercentageFadeDurationMillis?: number;
  readonly ctrlKeyWheelZoomingPinDurationMillis?: number;
  readonly velocityRollingAverageSize?: number;
}

export interface DragZoomAndDropProperties {
  center: Readonly<Vector2D>;
  velocity: Readonly<Vector2D>;
  localScale: number;
  state: "free" | "pinned";
}

export type ElementStateData =
  | { readonly kind: "idle" }
  | ActiveElementStateData;

type BaseActiveElementStateData = {
  /**
   * Percentage of the element to focus on.
   * If "dragging", this is just the pointer's position.
   * If "draggingAndZooming", this is the midpoint between the two pointers.
   */
  readonly focusedPoint: Readonly<Vector2D>;
  /** css translate pixels: stored if the initial element state was "pinned" and we want to snap back to that position. */
  readonly initialPinnedPosition: Readonly<Vector2D> | null;
  readonly activeDescendantElements: HTMLCollection;
  readonly velocityX: RollingAverage; // css translate pixels
  readonly velocityY: RollingAverage; // css translate pixels
  mostRecentMovementTimestamp: number;
};

// TODO consider defining a more rigorous state machine
export type ActiveElementStateData =
  | CtrlKeyWheelZoomingElementStateData
  | DraggingAndOrZoomingElementStateData;

export type CtrlKeyWheelZoomingElementStateData = BaseActiveElementStateData & {
  /**
   * A hybrid state where the mouse is hovered, the control key is pressed,
   * and we've received a wheel event within the last
   * {@link DragZoomAndDropConfig.ctrlKeyWheelZoomingPinDurationMillis}.
   */
  readonly kind: "ctrlKeyWheelZooming";
  readonly focusedPointMarker: HTMLElement;
  readonly revertToIdle: () => void;
  timeoutID: number;
  mostRecentEvent: WheelEvent;
};

export type DraggingAndOrZoomingElementStateData = BaseActiveElementStateData &
  (
    | {
        readonly kind: "dragging";
        readonly pointer: PointerState;
        zoomPercentage?: { readonly marker: HTMLElement; timeoutID: number };
      }
    | {
        readonly kind: "draggingAndZooming";
        pointers: [PointerState, PointerState];
        focusedPointMarker: HTMLElement;
        initialDistanceBetweenPointers: number; // client pixels
        initialLocalScale: number;
      }
  ) & {
    readonly listeners: DynamicListeners;
  };

export type PointerState = {
  marker: HTMLElement;
  mostRecentEvent: PointerEvent;
};

export interface DynamicListeners {
  readonly onPointerMove: Listener<PointerEvent>;
  readonly onPointerUp: Listener<PointerEvent>;
  readonly onElementOrAncestorScrolled: Listener<Event>;
  readonly scrollEventTargets: readonly (HTMLElement | Document)[];
}

export type Listener<E extends Event> = (event: E) => void;
