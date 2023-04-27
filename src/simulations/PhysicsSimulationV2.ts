import {
  Accessor,
  createEffect,
  createSignal,
  on,
  Setter,
  Signal,
} from "solid-js";
import { ReadonlyArray } from "../data-structures/Arrays";
import {
  kineticEnergy,
  PhysicsConstants,
  PhysicsElement,
  updateVelocityAndPosition,
} from "../math/Physics";
import { RollingAverage } from "../math/Stats";
import { X, Y } from "../math/Vectors";

// TODO add another state "focused" which is like "free" but instead of it moving around, the world moves around it so the viewer can keep a fixed reference frame on the element.
// TODO add another state that's like "pinned" but can still be dragged
export type PhysicsSimulationElementState = "free" | "pinned" | "dragged";

export interface PhysicsSimulationElement extends PhysicsElement {
  state: PhysicsSimulationElementState;
  simulationFrameCallback(): void;
}

export type PhysicsSimulationProps = Readonly<{
  constants: PhysicsConstants;
  elements: ReadonlyArray<PhysicsSimulationElement>;
  playingSignal: Signal<boolean>;
  maxStillFramesBeforeAutoPause?: number;
}>;

export function createSimulation(props: PhysicsSimulationProps) {
  const [isPlaying, setPlaying] = props.playingSignal;

  const rollingAverageEnergy = new RollingAverage(
    props.maxStillFramesBeforeAutoPause || 30
  );
  const simulationPerformance = new SimulationPerformance();

  function runAndMeasureOneStep(deltaMillis: number) {
    simulationPerformance.startClock(deltaMillis);
    runOneStep(
      deltaMillis,
      props.constants,
      props.elements,
      rollingAverageEnergy,
      setPlaying
    );
    simulationPerformance.stopClock();
  }

  const frameCallback = createFrameCallback(isPlaying, runAndMeasureOneStep);
  createEffect(
    on(isPlaying, (isPlaying, wasPlaying) => {
      if (isPlaying && !wasPlaying) {
        requestAnimationFrame(frameCallback);
      }
      // Else: frameCallback will automatically pause itself on the next frame
    })
  );
  return runAndMeasureOneStep;
}

const FIRST_FRAME_DELTA_MILLIS = 16;

function createFrameCallback(
  isPlaying: Accessor<boolean>,
  runOneStep: (deltaMillis: number) => void
): FrameRequestCallback {
  let previousFrameTime: DOMHighResTimeStamp | undefined = undefined;

  function frameCallback(time: DOMHighResTimeStamp) {
    if (!isPlaying()) {
      console.log("simulation paused: exiting animation loop");
      return;
    }

    if (previousFrameTime === undefined) {
      runOneStep(FIRST_FRAME_DELTA_MILLIS);
    } else if (time !== previousFrameTime) {
      runOneStep(time - previousFrameTime);
    }
    previousFrameTime = time;
    requestAnimationFrame(frameCallback);
  }

  return frameCallback;
}

function runOneStep(
  deltaMillis: number,
  constants: PhysicsConstants,
  elements: ReadonlyArray<PhysicsSimulationElement>,
  averageEnergy: RollingAverage,
  setPlaying: Setter<boolean>
) {
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
      updateVelocityAndPosition(element, constants, deltaMillis);
    }
    totalEnergy += kineticEnergy(element);
  }
  averageEnergy.add(totalEnergy);
  if (averageEnergy.isSaturated && averageEnergy.average() === 0) {
    setPlaying(false);
    averageEnergy.clear();
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
      "SimulationPerformance-end"
    );
    this.averagePerformance.add(p.duration);

    this.debugFrameCounter++;
    if (this.debugFrameCounter === 30) {
      console.log(
        `averages over the last 30 frames: runOneStep=${this.averagePerformance.average()}, frameDelta=${this.frameDeltaMillis.average()}`
      );
      this.debugFrameCounter = 0;
    }
  }
}
