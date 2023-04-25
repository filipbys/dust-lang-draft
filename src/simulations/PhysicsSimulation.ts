import {
  addElementIfAbsent,
  removeElementIfPresent,
} from "../data-structures/Arrays";
import {
  kineticEnergy,
  PhysicsConstants,
  PhysicsElement,
  updateVelocityAndPosition,
} from "../math/Physics";
import { RollingAverage } from "../math/Stats";
import { X, Y } from "../math/Vectors";
import { PhysicsSimulationElement } from "./PhysicsSimulationElement";

const FIRST_FRAME_DELTA_MILLIS = 16;

export class PhysicsSimulation {
  #playing: boolean = false;

  readonly #elements: PhysicsSimulationElement[] = [];

  readonly #frameCallback: FrameRequestCallback;

  constructor({
    constants,
    maxStillFramesBeforeAutoPause = 30,
  }: {
    constants: PhysicsConstants;
    maxStillFramesBeforeAutoPause?: number;
  }) {
    this.#frameCallback = frameCallback;

    const simulation = this;
    let previousFrameTime: DOMHighResTimeStamp | undefined = undefined;

    function frameCallback(time: DOMHighResTimeStamp) {
      if (!simulation.#playing) {
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
      for (const element of simulation.#elements) {
        element.force[X] = 0;
        element.force[Y] = 0;
      }

      for (const element of simulation.#elements) {
        if (element.calculateForces !== undefined) {
          element.calculateForces(getPhysicsSimulationElementChildren(element));
        }
      }
    }

    const averageEnergy = new RollingAverage(maxStillFramesBeforeAutoPause);
    function updateVelocitiesAndPositions(deltaMillis: number) {
      let totalEnergy = 0;
      for (const element of simulation.#elements) {
        if (element.state === "free") {
          updateVelocityAndPosition(element, constants, deltaMillis);
        }
        totalEnergy += kineticEnergy(element);
      }
      averageEnergy.add(totalEnergy);
    }

    function autoPauseIfNeeded() {
      if (averageEnergy.isSaturated && averageEnergy.average() === 0) {
        simulation.pause();
        averageEnergy.clear();
      }
    }
  }

  // TODO I wonder if we can use solidjs's reactivity rather than having to write these add/remove method pairs...
  addElement(element: PhysicsSimulationElement) {
    addElementIfAbsent(this.#elements, element, "Simulation.addElement");
    this.play();
  }

  removeElement(element: PhysicsSimulationElement) {
    removeElementIfPresent(this.#elements, element, "Simulation.removeElement");
    this.play();
  }

  play() {
    if (this.#playing) {
      return;
    }
    this.#playing = true;
    requestAnimationFrame(this.#frameCallback);
  }

  pause() {
    if (!this.#playing) {
      return;
    }
    this.#playing = false; // next frame callback will return early
  }
}

function getPhysicsSimulationElementChildren(
  element: PhysicsSimulationElement
): PhysicsSimulationElement[] {
  const result: PhysicsSimulationElement[] = [];
  for (const child of element.children) {
    if (child instanceof PhysicsSimulationElement) {
      result.push(child);
    }
  }
  return result;
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
