import {
  kineticEnergy,
  PhysicsConstants,
  PhysicsElement,
  updateVelocityAndPosition,
} from "./Physics";
import { RollingAverage } from "./Stats";
import { X, Y } from "./Vectors";

// TODO!! too many implementation details of drag-zoom-drop are bleeding in here. Let's keep just "free" and "fixed"/"pinned" and move the other kinds of states into the drag-zoom-drop code. This state just needs to coordinate between physics, layout, and drag-zoom-drop. IN FACT maybe we could represent it as a kind of "owner" instead? As in, what currently owns this element: is it a parent physics element that's simulating forces, is it a user moving it around, or is it pinned in a fixed layout?

// TODO add another state "focused" which is like "free" but instead of it moving around, the world moves around it so the viewer can keep a fixed reference frame on the element.
// TODO add another state that's like "pinned" but can still be dragged
export type PhysicsSimulationElementState =
  | "free" // Can be pushed around by physics forces
  | "pinned"; // Can't be affected by physics forces because it's either being dragged or fixed in a different HTML/CSS layout.
// {
//   position:
//     | "pinned" // Can't be pushed around or dragged (but may be zoomed)
//     | "free" // Can be pushed around by physics forces or dragged by the user
//     | "focused" // TODO implement this: like "free" in that it can be dragged by the user, but it can't be pushed around by other elements because it either has focus or is hovered
//     | "dragging"; // Is currently being dragged
//   scale:
//     | "fixed" // Is not currently changing
//     | "pressed" // Ready to start zooming (e.g. position is pinned and the user has a single pointer down.)
//     | "zooming"; // Is currently being changed by the user (e.g. with pinch gestures)
// };
// | "free" // Can be dragged and zoomed
// | "pinned" // Can't be dragged, but may be zoomed
// | "pressed" // Same as "pinned", but when the user is pressing/clicking on the element
// | "zooming" // Is currently being zoomed
// | "dragging" // Is currently being dragged

export interface PhysicsSimulationElement extends PhysicsElement {
  state: PhysicsSimulationElementState;
  simulationFrameCallback?(): void;
}

export type PhysicsSimulationProps = Readonly<{
  physicsConstants: PhysicsConstants;
  elements: Iterable<PhysicsSimulationElement>;
  maxStillFramesBeforeAutoPause?: number;
  onAutoPause(): void;
}>;

export const FIRST_FRAME_DELTA_MILLIS = 16;

export type PhysicsSimulation = {
  playing: boolean;
  runOneStep(deltaMillis?: number): void;
};

export function createSimulation(
  props: PhysicsSimulationProps,
): PhysicsSimulation {
  const {
    physicsConstants,
    maxStillFramesBeforeAutoPause = 30,
    onAutoPause,
  } = props; // TODO the caller using "get elements" relies on us not destructuring elements here. Refactor the function to accept a () => Elements instead.

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
  function runAndMeasureOneStep(deltaMillis: number) {
    simulationPerformance.startClock(deltaMillis);
    runOneStep(deltaMillis);
    simulationPerformance.stopClock();
  }

  const averageEnergy = new RollingAverage(maxStillFramesBeforeAutoPause);

  // TODO still need to figure out how to batch(()=>{this})
  function runOneStep(deltaMillis: number = FIRST_FRAME_DELTA_MILLIS) {
    const elements = props.elements;
    for (const element of elements) {
      element.force[X] = 0;
      element.force[Y] = 0;
    }
    for (const element of elements) {
      element.simulationFrameCallback?.();
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
