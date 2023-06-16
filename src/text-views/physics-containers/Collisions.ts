import { Springs } from "../../math/Physics";
import {
  PhysicsSimulationElement,
  tryMove,
} from "../../math/PhysicsSimulation";
import { vectorsEqual, X, Y } from "../../math/Vectors";

export function preventCollisions(
  physicsElements: readonly PhysicsSimulationElement[],
) {
  const collisionSpringConstant = 0.05; // 1/(millis^2): strongly repel colliding elements
  const idealGapBetweenElements = 20;

  // TODO if number of elements is high enough, switch to a better algorithm like spatial hash grids.

  for (let i = 0; i < physicsElements.length; i++) {
    const first = physicsElements[i];
    for (let j = i + 1; j < physicsElements.length; j++) {
      const second = physicsElements[j];
      if (vectorsEqual(first.center, second.center)) {
        tryMove(first, [first.center[X] - 1, first.center[Y]]);
        tryMove(second, [second.center[X] + 1, second.center[Y]]);
      }
      Springs.preventCollisions(
        first,
        second,
        collisionSpringConstant,
        idealGapBetweenElements,
      );
    }
  }
}
