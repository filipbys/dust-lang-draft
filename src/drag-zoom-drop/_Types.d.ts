import { RollingAverage } from "../math/Stats";
import { Vector2D } from "../math/Vectors";

export interface DragZoomAndDropProperties {
  center: Readonly<Vector2D>;
  velocity: Readonly<Vector2D>;
  localScale: number;
  state: "free" | "pinned";
}

export type DragZoomAndDropConfig = Readonly<{
  properties: DragZoomAndDropProperties;
  positionMarkerDiameter: string; // any valid css size
  velocityRollingAverageSize?: number;
}>;

export type PointerState = {
  marker: HTMLElement;
  mostRecentEvent: PointerEvent;
};

export type ElementState = {
  readonly properties: DragZoomAndDropProperties;
  readonly velocityX: RollingAverage; // css translate pixels
  readonly velocityY: RollingAverage; // css translate pixels
  initialPinnedPosition?: Readonly<Vector2D>; // css translate pixels: stored if the initial element state was "pinned" and we want to snap back to that position.
  data: ElementStateData;
} & DynamicListeners;

export type ElementStateData =
  | { kind: "idle" }
  | {
      kind: "dragging";
      pointer: PointerState;
      focusedPoint: Readonly<Vector2D>; // percentage of the element
    }
  | {
      kind: "zooming";
      pointers: [PointerState, PointerState];
      focusedPoint: Readonly<Vector2D>; // percentage of the element
      focusedPointMarker: HTMLElement;
      initialDistanceBetweenPointers: number; // client pixels
      initialLocalScale: number;
    };

export type StaticListeners = Readonly<{
  onPointerDown(event: PointerEvent): void;
  onWheelEvent(event: WheelEvent): void;
}>;

export type DynamicListeners = Readonly<{
  onPointerMove(event: PointerEvent): void;
  onPointerUpOrCancel(event: PointerEvent): void;
  onAncestorElementMoved(event: Event): void;
}>;
