import { PhysicsSimulationElement } from "./PhysicsSimulationElement";

export const bubbleElementResizeObserverOptions: Readonly<ResizeObserverOptions> =
  {
    box: "border-box",
  };

export function updateDiametersIfNeeded(
  entries: readonly ResizeObserverEntry[]
) {
  console.log("DustWindows resizeObserver:", entries);
  for (const entry of entries) {
    const bubbleElement = entry.target
      .parentElement as PhysicsSimulationElement;
    const borderBox = entry.borderBoxSize[0];
    bubbleElement.diameter = Math.hypot(
      borderBox.blockSize,
      borderBox.inlineSize
    );
  }
}
