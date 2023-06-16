import {
  kineticEnergy,
  PhysicsConstants,
  PhysicsElement,
  updateVelocityAndPosition,
} from "./Physics";
import { RollingAverage } from "./Stats";
import { Vector2D, X, Y } from "./Vectors";

// TODO!! too many implementation details of drag-zoom-drop are bleeding in here. Let's keep just "free" and "fixed"/"pinned" and move the other kinds of states into the drag-zoom-drop code. This state just needs to coordinate between physics, layout, and drag-zoom-drop. IN FACT maybe we could represent it as a kind of "owner" instead? As in, what currently owns this element: is it a parent physics element that's simulating forces, is it a user moving it around, or is it pinned in a fixed layout?

// TODO add another state "focused" which is like "free" but instead of it moving around, the world moves around it so the viewer can keep a fixed reference frame on the element.
// TODO add another state that's like "pinned" but can still be dragged
export type PhysicsSimulationElementState =
  | "free" // Can be pushed around by physics forces
  | "pinned"; // Can't be affected by physics forces because it's either being dragged or fixed in a different HTML/CSS layout.

export interface PhysicsSimulationElement extends PhysicsElement {
  state: PhysicsSimulationElementState;
}

export interface PhysicsSimulationElementContainer<
  Elements extends readonly PhysicsSimulationElement[],
> {
  getPhysicsElements(): Elements;
  updateForces(elements: Elements): void;
  updateContainer(elements: Elements): void;
}

export type PhysicsSimulationProps<
  Elements extends readonly PhysicsSimulationElement[],
> = Readonly<{
  physicsConstants: PhysicsConstants;
  getActiveContainers(): Iterable<PhysicsSimulationElementContainer<Elements>>;
  maxStillFramesBeforeAutoPause?: number;
  onAutoPause(): void;
}>;

export const FIRST_FRAME_DELTA_MILLIS = 16;

export type PhysicsSimulation = {
  playing: boolean;
  runOneStep(deltaMillis?: number): void;
};

export function createSimulation<
  Elements extends readonly PhysicsSimulationElement[],
>({
  physicsConstants,
  getActiveContainers,
  maxStillFramesBeforeAutoPause = 30, // TODO consider refactoring this to milliseconds
  onAutoPause,
}: PhysicsSimulationProps<Elements>): PhysicsSimulation {
  const averageEnergy = new RollingAverage(maxStillFramesBeforeAutoPause);

  let isPlaying = false;
  const simulation = {
    get playing() {
      return isPlaying;
    },
    set playing(value: boolean) {
      if (value === isPlaying) {
        return;
      }
      isPlaying = value;
      if (isPlaying) {
        requestAnimationFrame(frameRequestCallback);
      } else {
        averageEnergy.clear();
      }
    },
    runOneStep,
  };

  let previousFrameTime: DOMHighResTimeStamp | undefined = undefined;
  function frameRequestCallback(time: DOMHighResTimeStamp) {
    if (!isPlaying) {
      console.log("simulation paused: exiting animation loop");
      return;
    }

    if (previousFrameTime === undefined) {
      runAndMeasureOneStep(FIRST_FRAME_DELTA_MILLIS);
    } else if (time !== previousFrameTime) {
      runAndMeasureOneStep(time - previousFrameTime);
    }
    previousFrameTime = time;
    requestAnimationFrame(frameRequestCallback);
  }

  const simulationPerformance = new SimulationPerformance();
  function runAndMeasureOneStep(deltaMillis: number) {
    simulationPerformance.startClock(deltaMillis);
    runOneStep(deltaMillis);
    simulationPerformance.stopClock();
  }

  // TODO still need to figure out how to batch(()=>{this})
  function runOneStep(deltaMillis: number = FIRST_FRAME_DELTA_MILLIS) {
    let totalEnergy = 0;

    for (const container of getActiveContainers()) {
      const elements = container.getPhysicsElements();

      for (const element of elements) {
        element.force[X] = 0;
        element.force[Y] = 0;
      }

      container.updateForces(elements);

      for (const element of elements) {
        if (element.state === "free") {
          updateVelocityAndPosition(element, physicsConstants, deltaMillis);
        }
        totalEnergy += kineticEnergy(element);
      }

      container.updateContainer(elements);
    }

    averageEnergy.add(totalEnergy);
    // TODO handle the case where the average energy doesn't go down and request a bug report.
    if (averageEnergy.isSaturated && averageEnergy.average() === 0) {
      isPlaying = false;
      onAutoPause();
      averageEnergy.clear();
    }
  }

  return simulation;
}

export function tryMove(
  element: PhysicsSimulationElement,
  newCenter: Readonly<Vector2D>,
) {
  if (element.state === "free") {
    element.center = newCenter;
  }
}

class SimulationPerformance {
  averagePerformance = new RollingAverage(30);
  frameDeltaMillis = new RollingAverage(30);
  debugFrameCounter = 0;

  startClock(frameDeltaMillis: number) {
    this.frameDeltaMillis.add(frameDeltaMillis);
    performance.mark("SimulationPerformance-start");
  }

  stopClock() {
    performance.mark("SimulationPerformance-end");
    const p = performance.measure(
      "SimulationPerformance",
      "SimulationPerformance-start",
      "SimulationPerformance-end",
    );
    this.averagePerformance.add(p.duration);

    this.debugFrameCounter++;
    if (this.debugFrameCounter === 30) {
      console.log(
        `averages over the last 30 frames: runOneStep=${this.averagePerformance.average()}, frameDelta=${this.frameDeltaMillis.average()}`,
      );
      this.debugFrameCounter = 0;
    }
  }
}
