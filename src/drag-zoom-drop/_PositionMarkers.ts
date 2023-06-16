import { Vector2D, X, Y } from "../math/Vectors";
import "./_PositionMarkers.css";

export function createPositionMarker(
  percentageOffset: Readonly<Vector2D>,
  diameter: string, // Any valid css size
  kind: "pointer" | "focus",
): HTMLElement {
  const marker = document.createElement("div");
  marker.setAttribute("class", `Dust circle positionMarker ${kind}`);
  marker.style.setProperty("--diameter", diameter);
  setPositionMarkerOffset(marker, percentageOffset);
  return marker;
}

export function setPositionMarkerOffset(
  marker: HTMLElement,
  percentageOffset: Readonly<Vector2D>,
) {
  marker.style.setProperty("--left-percent", percentageOffset[X] + "%");
  marker.style.setProperty("--top-percent", percentageOffset[Y] + "%");
}

export function createFocusMarker(
  percentageOffset: Readonly<Vector2D>,
  scale: number,
): HTMLElement {
  const marker = createPositionMarker(
    percentageOffset,
    "6ch", // enough to fit 10000%
    "focus",
  );
  setFocusMarkerScaleText(marker, scale);
  return marker;
}

export function setFocusMarkerScaleText(marker: HTMLElement, scale: number) {
  marker.textContent = (scale * 100).toFixed() + "%";
}
