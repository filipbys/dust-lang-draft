import {
  PhysicsConstants,
  PhysicsElement,
  updateVelocityAndPosition,
} from "../math/Physics";
import { RollingAverage } from "../math/Stats";
import { Vector2D } from "../math/Vectors";

export interface SimulationElement extends PhysicsElement {
  state: SimulationElementState;
}

export type SimulationElementState = "free" | "pinned" | "dragged";

type ForceCalculator = () => any;

const FIRST_FRAME_DELTA_MILLIS = 16;

export class Simulation<T extends SimulationElement> {
  // TODO track all elements that can move around (e.g. they're in a module and/or they're being dragged)
  // Track whether the simulation is playing. Expose a play() method that starts the simulation using requestAnimationFrame if not already playing, and a pause() method that stops the simulation before the next frame.
  // Update element positions on every frame while playing
  // If no positions changed in X frames since the last play(), automatically pause()

  #playing: boolean = false;

  #elements: T[] = [];

  #forceCalculators: ForceCalculator[] = [];

  readonly #frameCallback: FrameRequestCallback;

  constructor(constants: PhysicsConstants) {
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

      for (const forceCalculator of simulation.#forceCalculators) {
        forceCalculator();
      }

      for (const element of simulation.#elements) {
        if (element.state === "free") {
          updateVelocityAndPosition(element, constants, deltaMillis);
          // TODO automatically pause if nothing moved in the last X frames
        }
      }

      simulationPerformance.stopClock();
    }
  }

  // TODO I wonder if we can use solidjs's reactivity rather than having to write these add/remove method pairs...
  addElement(element: T) {
    if (this.#elements.includes(element)) {
      console.warn("Element already exists in the simulation:", element);
      return;
    }
    console.log("Adding element to simulation:", element);
    this.#elements.push(element);
  }

  removeElement(element: T) {
    if (!this.#elements.includes(element)) {
      console.warn("Element does not exist in the simulation:", element);
      return;
    }
    console.log("Removing element from simulation:", element);
    this.#elements = this.#elements.filter((it) => it === element);
  }

  addForceCalculator(calculator: ForceCalculator) {
    if (this.#forceCalculators.includes(calculator)) {
      console.warn("Calculator already exists in the simulation:", calculator);
      return;
    }
    console.log("Adding calculator to simulation:", calculator);
    this.#forceCalculators.push(calculator);
  }

  removeForceCalculator(calculator: ForceCalculator) {
    if (!this.#forceCalculators.includes(calculator)) {
      console.warn("Calculator does not exist in the simulation:", calculator);
      return;
    }
    console.log("Removing calculator from simulation:", calculator);
    this.#forceCalculators = this.#forceCalculators.filter(
      (it) => it === calculator
    );
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

class SimulationPerformance {
  runOneStepPerformance = new RollingAverage(30);
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
    this.runOneStepPerformance.add(p.duration);

    this.debugFrameCounter++;
    if (this.debugFrameCounter === 30) {
      console.log(
        `averages over the last 30 frames: runOneStep=${this.runOneStepPerformance.average()}, frameDelta=${this.frameDeltaMillis.average()}`
      );
      this.debugFrameCounter = 0;
    }
  }
}
