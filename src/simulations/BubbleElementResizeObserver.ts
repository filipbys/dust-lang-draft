import { PhysicsSimulationElement } from "./PhysicsSimulationElement";

export const bubbleElementResizeObserverOptions: Readonly<ResizeObserverOptions> =
  {
    box: "border-box",
  };

export function createBubbleElementResizeObserver(): ResizeObserver {
  const observer = new ResizeObserver(updateDiametersIfNeeded);
  return observer;

  function updateDiametersIfNeeded(entries: readonly ResizeObserverEntry[]) {
    console.log("DustWindows resizeObserver:", entries);
    for (const entry of entries) {
      const parent = entry.target.parentElement;
      if (parent === null) {
        console.warn(
          "Observer should no longer be observing detached element",
          entry.target
        );
        observer.unobserve(entry.target);
        continue;
      }
      const bubbleElement = parent as PhysicsSimulationElement;
      const borderBox = entry.borderBoxSize[0];
      bubbleElement.diameter = Math.hypot(
        borderBox.blockSize,
        borderBox.inlineSize
      );
    }
  }
}
