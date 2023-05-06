import { ReadonlyArray } from "../data-structures/Arrays";
import {
  kineticEnergy,
  PhysicsConstants,
  PhysicsElement,
  updateVelocityAndPosition,
} from "./Physics";
import { RollingAverage } from "./Stats";
import { X, Y } from "./Vectors";

// TODO add another state "focused" which is like "free" but instead of it moving around, the world moves around it so the viewer can keep a fixed reference frame on the element.
// TODO add another state that's like "pinned" but can still be dragged
export type PhysicsSimulationElementState =
  | "free"
  | "pinned"
  | "dragging"
  | "zooming";

export interface PhysicsSimulationElement extends PhysicsElement {
  state: PhysicsSimulationElementState;
  simulationFrameCallback(): void;
}

export type PhysicsSimulationProps = Readonly<{
  physicsConstants: PhysicsConstants;
  elements: ReadonlyArray<PhysicsSimulationElement>;
  maxStillFramesBeforeAutoPause?: number;
  onAutoPause(): void;
}>;

export const FIRST_FRAME_DELTA_MILLIS = 16;

export type PhysicsSimulation = {
  playing: boolean;
  runOneStep(deltaMillis?: number): void;
};

export function createSimulation({
  physicsConstants,
  elements,
  maxStillFramesBeforeAutoPause = 30,
  onAutoPause,
}: PhysicsSimulationProps): PhysicsSimulation {
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
  function runAndMeasureOneStep(
    deltaMillis: number = FIRST_FRAME_DELTA_MILLIS,
  ) {
    simulationPerformance.startClock(deltaMillis);
    runOneStep(deltaMillis);
    simulationPerformance.stopClock();
  }

  const averageEnergy = new RollingAverage(maxStillFramesBeforeAutoPause);

  // TODO still need to figure out how to batch(()=>{this})
  function runOneStep(deltaMillis: number) {
    for (const element of elements) {
      element.force[X] = 0;
      element.force[Y] = 0;
    }
    for (const element of elements) {
      element.simulationFrameCallback();
    }

    let totalEnergy = 0;
    for (const element of elements) {
      if (element.state === "free") {
        updateVelocityAndPosition(element, physicsConstants, deltaMillis);
      }
      totalEnergy += kineticEnergy(element);
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
