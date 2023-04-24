import {
  kineticEnergy,
  PhysicsConstants,
  PhysicsElement,
  updateVelocityAndPosition,
} from "../math/Physics";
import { RollingAverage } from "../math/Stats";
import { Vector2D, X, Y } from "../math/Vectors";

export interface SimulationElement extends PhysicsElement {
  state: SimulationElementState;
}

export type SimulationElementState = "free" | "pinned" | "dragged";

type ForceCalculator = () => any;

const FIRST_FRAME_DELTA_MILLIS = 16;

export class Simulation<T extends SimulationElement> {
  #playing: boolean = false;

  readonly #elements: T[] = [];

  readonly #forceCalculators: ForceCalculator[] = [];

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

      for (const updateForces of simulation.#forceCalculators) {
        updateForces();
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
  addElement(element: T) {
    if (addElementIfAbsent(this.#elements, element)) {
      console.log("Added element to simulation:", element);
    } else {
      console.warn("Element already exists in the simulation:", element);
    }
  }

  removeElement(element: T) {
    if (removeElementIfPresent(this.#elements, element)) {
      console.log("Removed element from simulation:", element);
    } else {
      console.warn("Element does not exist in the simulation:", element);
    }
  }

  addForceCalculator(calculator: ForceCalculator) {
    if (addElementIfAbsent(this.#forceCalculators, calculator)) {
      console.log("Added calculator to simulation:", calculator);
    } else {
      console.warn("Calculator already exists in the simulation:", calculator);
    }
  }

  removeForceCalculator(calculator: ForceCalculator) {
    if (removeElementIfPresent(this.#forceCalculators, calculator)) {
      console.log("Removed calculator from simulation:", calculator);
    } else {
      console.warn("Calculator does not exist in the simulation:", calculator);
    }
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

function addElementIfAbsent<T>(array: T[], element: T): boolean {
  if (!array.includes(element)) {
    array.push(element);
    return true;
  }
  return false;
}

function removeElementIfPresent<T>(array: T[], element: T): boolean {
  if (array.includes(element)) {
    array.splice(array.indexOf(element), 1);
    return true;
  }
  return false;
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
