import { createEffect, createSignal, on, Signal } from "solid-js";
import { ReadonlyArray } from "../data-structures/Arrays";
import {
  kineticEnergy,
  PhysicsConstants,
  updateVelocityAndPosition,
} from "../math/Physics";
import { RollingAverage } from "../math/Stats";
import { X, Y } from "../math/Vectors";
import { PhysicsSimulationElement } from "./PhysicsSimulationElementV2";

const FIRST_FRAME_DELTA_MILLIS = 16;

export type PhysicsSimulationProps = Readonly<{
  constants: PhysicsConstants;
  elements: ReadonlyArray<PhysicsSimulationElement>;
  maxStillFramesBeforeAutoPause?: number;
  setPlaying: (value: boolean) => void;
}>;

export function createSimulation(
  props: PhysicsSimulationProps
): Signal<boolean> {
  const playingSignal: Signal<boolean> = createSignal(false);
  const frameCallback = createFrameCallback(props, playingSignal);
  let requestHandle: number;
  createEffect(
    on(playingSignal[0], (isPlaying, wasPlaying) => {
      if (isPlaying && !wasPlaying) {
        requestHandle = requestAnimationFrame(frameCallback);
      }
      if (!isPlaying && wasPlaying) {
        cancelAnimationFrame(requestHandle);
      }
    })
  );
  return playingSignal;
}

function createFrameCallback(
  {
    constants,
    elements,
    maxStillFramesBeforeAutoPause = 30,
  }: PhysicsSimulationProps,
  [playing, setPlaying]: Signal<boolean>
): FrameRequestCallback {
  let previousFrameTime: DOMHighResTimeStamp | undefined = undefined;

  function frameCallback(time: DOMHighResTimeStamp) {
    if (!playing()) {
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

  const simulationPerformance = new SimulationPerformance();
  function runOneStep(deltaMillis: number) {
    simulationPerformance.startClock(deltaMillis);
    recalculateForces();
    updateVelocitiesAndPositions(deltaMillis);
    autoPauseIfNeeded();
    simulationPerformance.stopClock();
  }

  function recalculateForces() {
    // TODO consider automatically detecting collisions for all element pairs, since there should only ever be so many PhysicsSimulationElement in the Window anyway. Dust should remove those DOM elements when the Dust expressions are not visible to the user, either because they're at a different zoom level or because they're outside of the Window's bounds.

    for (const element of elements) {
      element.force[X] = 0;
      element.force[Y] = 0;
    }

    for (const element of elements) {
      // TODO need to potentially update diameter as well if the element is a "collection"
      element.frameCallback();
    }
  }

  const averageEnergy = new RollingAverage(maxStillFramesBeforeAutoPause);
  function updateVelocitiesAndPositions(deltaMillis: number) {
    let totalEnergy = 0;
    for (const element of elements) {
      if (element.state === "free") {
        updateVelocityAndPosition(element, constants, deltaMillis);
      }
      totalEnergy += kineticEnergy(element);
    }
    averageEnergy.add(totalEnergy);
  }

  function autoPauseIfNeeded() {
    if (averageEnergy.isSaturated && averageEnergy.average() === 0) {
      setPlaying(false);
      averageEnergy.clear();
    }
  }

  return frameCallback;
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