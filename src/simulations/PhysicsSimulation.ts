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
import { updateDiametersIfNeeded } from "./BubbleElementResizeObserver";
import { PhysicsSimulationElement } from "./PhysicsSimulationElement";

const FIRST_FRAME_DELTA_MILLIS = 16;

export class PhysicsSimulation {
  readonly #playing: () => boolean;
  readonly #setPlaying: (playing: boolean) => void;

  readonly #elements: PhysicsSimulationElement[] = [];

  readonly #frameCallback: FrameRequestCallback;

  // TODO for tests use https://stackoverflow.com/questions/64558062/how-to-mock-resizeobserver-to-work-in-unit-tests-using-react-testing-library
  // TODO figure out a way to make this package-private
  readonly bubbleElementResizeObserver = new ResizeObserver(
    updateDiametersIfNeeded
  );

  constructor({
    constants,
    playingSignal: [playing, setPlaying],
    maxStillFramesBeforeAutoPause = 30,
  }: {
    constants: PhysicsConstants;
    playingSignal: [
      isPlaying: () => boolean,
      setPlaying: (playing: boolean) => void
    ];
    maxStillFramesBeforeAutoPause?: number;
  }) {
    this.#playing = playing;
    this.#setPlaying = setPlaying;
    this.#frameCallback = frameCallback;

    const simulation = this;
    let previousFrameTime: DOMHighResTimeStamp | undefined = undefined;

    function frameCallback(time: DOMHighResTimeStamp) {
      if (!simulation.playing) {
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
        // TODO need to potentially update diameter as well if the element is a "collection"
        element.updateForces();
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
        simulation.playing = false;
        averageEnergy.clear();
      }
    }
  }

  // TODO figure out a way to make this package-private
  addElement(element: PhysicsSimulationElement) {
    addElementIfAbsent(this.#elements, element, "Simulation.addElement");
    this.playing = true;
  }

  // TODO figure out a way to make this package-private
  removeElement(element: PhysicsSimulationElement) {
    removeElementIfPresent(this.#elements, element, "Simulation.removeElement");
    this.playing = true;
  }

  get playing(): boolean {
    return this.#playing();
  }

  set playing(value: boolean) {
    if (this.#playing() === value) {
      return;
    }
    this.#setPlaying(value);
    if (value) {
      requestAnimationFrame(this.#frameCallback);
    }
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
