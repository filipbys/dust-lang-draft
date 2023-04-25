import { updateElementText } from "../development/Debugging";
import { makeDraggable } from "../simulations/DragAndDrop";
import { Springs } from "../math/Physics";
import {
  ForceCalculator,
  PhysicsSimulationElement,
} from "../simulations/PhysicsSimulationElement";
import { RollingAverage } from "../math/Stats";
import { X, Y } from "../math/Vectors";

// TODO create a similar simulation for unordered containers/collections which has only public elements and just distributes them as evenly as possible
// ==> Extract shared code between them into other namespaces:
//      - vector math
//      - spring force math
//      - drag and drop
//      - pinning

const PHYSICS_CONSTANTS = {
  maxVelocity: 2,
  dragMultiplier: 0.995,
  frictionCoefficient: 0.01,
} as const;

export const updateForcesInModule: ForceCalculator = (
  moduleElement: PhysicsSimulationElement,
  physicsElements: PhysicsSimulationElement[]
) => {
  const idealGapBetweenElements = 20;

  const collisionSpringConstant = 100; // 1/(millis^2): strongly repel colliding elements

  const spreadSpringConstant = 0.25; // gently spread all elements away from all others

  const publicElementsToBorderSpringConstant = 100; // Strongly pull towards the module's border
  const privateElementsToCenterSpringConstant = 20; // Strongly pull toowards the center

  let sumOfPublicElementGapsToBorder = 0;
  let sumOfPrivateElementGapsToBorder = 0;

  for (const element of physicsElements) {
    if (element.classList.contains("public")) {
      Springs.connectBorders(
        element,
        moduleElement,
        publicElementsToBorderSpringConstant,
        -element.diameter
      );
      sumOfPublicElementGapsToBorder += Springs.keepWithin(
        element,
        moduleElement,
        collisionSpringConstant * 2,
        0
      );
    } else {
      // TODO put this force on the moduleElement rather than the moduleName
      Springs.connectBorders(
        element,
        moduleElement,
        privateElementsToCenterSpringConstant,
        -moduleElement.diameter / 2
      );
      sumOfPrivateElementGapsToBorder += Springs.keepWithin(
        element,
        moduleElement,
        collisionSpringConstant * 2,
        idealGapBetweenElements
      );
    }
  }

  let sumOfGapsBetweenElements = 0;
  // TODO sumOfGapsBetweenNearbyElements
  let sumOfGapsBetweenOverlappingElements = 0;
  for (let i = 0; i < physicsElements.length; i++) {
    const first = physicsElements[i];
    for (let j = i + 1; j < physicsElements.length; j++) {
      const second = physicsElements[j];
      Springs.connectCenters(
        first,
        second,
        spreadSpringConstant,
        moduleElement.diameter
      );
      const gap = Springs.preventCollisions(
        first,
        second,
        collisionSpringConstant,
        idealGapBetweenElements
      );
      sumOfGapsBetweenElements += gap;
      if (gap < 0) {
        sumOfGapsBetweenOverlappingElements += gap;
      }
    }
  }

  // TODO show the total force on the moduleElement as well. moduleName forces should be just from collisions
  // TODO calculate average overlap between elements, as well as average distance of public/private elements to border

  // TODO use these to grow/shrink the module automatically
  // TODO calculate module area and compare it to sum of element areas

  // TODO use average distance of public elements to border to grow/shrink the module
  // also grow the module if any private elements end up touching the border
};

/*
function makeRandomPhysicsElement(
  id: number | string,
  isPublic: boolean,
  parent: PhysicsElement
): PhysicsElement {
  const htmlElement = document.createElement("div");
  const kind = isPublic ? "public" : "private";
  htmlElement.classList.add("Dust", "moduleElement", kind);

  const diameter = Math.floor(200 + Math.random() * 100);

  htmlElement.style.width = diameter + "px";
  htmlElement.style.height = diameter + "px";
  htmlElement.style.borderRadius = diameter + "px"; // just needs to be bigger than the element's radius

  parent.htmlElement.appendChild(htmlElement);

  const mass = diameter ** 2;

  htmlElement.append(
    span("#" + id),
    span(`${kind}, d = ${diameter}, m = ${mass}`),
    span(`...`, "debug_info")
  );

  const element = new PhysicsElement({
    htmlElement,
    state: "free",
    diameter,
    mass,
    centeredWithinParent: true,
  });
  makeDraggable(element);
  return element;
}

const test_data: {
  simulation: Simulation | undefined;
  next_element_id: number;
  playing: boolean;
} = {
  simulation: undefined,
  next_element_id: 0,
  playing: false,
};

export function testAddRandomElement(isPublic: boolean) {
  const simulation: Simulation = test_data.simulation!;

  const newPhysicsElement = makeRandomPhysicsElement(
    test_data.next_element_id,
    isPublic,
    simulation.moduleElement
  );
  simulation.elements.push(newPhysicsElement);
  test_data.next_element_id++;

  newPhysicsElement.htmlElement.append(
    button("pin/unpin", (event) => {
      console.log(`pin/unpin, current state = ${newPhysicsElement.state}`);
      if (newPhysicsElement.state === "pinned") {
        newPhysicsElement.state = "free";
        // TODO toggle a css class instead of setting the style here
        newPhysicsElement.htmlElement.style.backgroundColor = "";
      } else {
        newPhysicsElement.state = "pinned";
        newPhysicsElement.htmlElement.style.backgroundColor =
          "rgba(0, 0, 0, 0.1)";
        newPhysicsElement.velocity.x = 0;
        newPhysicsElement.velocity.y = 0;
      }
      event.stopPropagation();
    }),
    button("remove", () => {
      simulation.elements = simulation.elements.filter(
        (it) => it !== newPhysicsElement
      );
      newPhysicsElement.htmlElement.remove();
    })
  );

  // drop elements in a little above and to the left of the center
  newPhysicsElement.center = {
    x: -100 - 100 * Math.random(),
    y: -100 - 100 * Math.random(),
  };
  updateElementText(newPhysicsElement);
}

function updateDiameter(element: PhysicsElement, delta: number) {
  element.diameter += delta;
  element.mass = element.diameter ** 2; // TODO
}

// export function testInit2(moduleId: string) {
//   testInit(document.getElementById(moduleId)!);
// }

// export function testInit(module: HTMLElement) {
//   // TODO extract an initialization function that takes a possibly-empty list of elements
//   const bounds = module.getBoundingClientRect();
//   const moduleElement = new PhysicsElement({
//     htmlElement: module,
//     state: "pinned",
//     diameter: Math.floor(Math.max(bounds.width, bounds.height)),
//   });

//   module.append(
//     button("grow", () => updateDiameter(moduleElement, 20)),
//     button("shrink", () => updateDiameter(moduleElement, -20))
//   );

//   const moduleName = makeRandomPhysicsElement(
//     "TestModule",
//     false,
//     moduleElement
//   );
//   moduleName.htmlElement.classList.add("moduleName");
//   updateElementText(moduleName);
//   moduleName.state = "pinned";

//   test_data.simulation = {
//     moduleElement,
//     moduleName,
//     elements: [],
//   };
// }

export function testRunOneStep() {
  runOneStep(test_data.simulation!, 16);
}

// TODO once we have an automatic ending condition, let's try generating an svg path for each
// element ahead of time and then letting the CSS animate it. Measure how long it takes to generate the paths, as well as the overall CPU performance
export function testRunPlay() {
  if (test_data.playing) {
    console.log("simulation already playing");
    return;
  }
  test_data.playing = true;
  const simulation: Simulation = test_data.simulation!;
  requestAnimationFrame(frameCallback);

  let previousFrameTime: DOMHighResTimeStamp | undefined = undefined;

  // TODO use rollingaverage
  function avg(arr: number[]): number {
    return arr.reduce((a, b) => a + b) / arr.length;
  }

  let last30RunOneStepTimes: number[] = [];
  let last30FrameDeltas: number[] = [];

  function frameCallback(time: DOMHighResTimeStamp) {
    if (previousFrameTime === undefined) {
      // first frame
      runOneStep(simulation, 16);
      previousFrameTime = time;
      requestAnimationFrame(frameCallback);
      return;
    }
    if (!test_data.playing) {
      // TODO extract an animation module which automatically stops animations when they reach
      // a steady state, and automatically resumes them if something changes (use ResizeObserver for size changes and also observe changes to the DustExpression)
      console.log("simulation paused: exiting animation loop");
      return;
    }
    if (time !== previousFrameTime) {
      const deltaMillis = time - previousFrameTime;
      performance.mark("runOneStep-start");
      runOneStep(simulation, deltaMillis);
      performance.mark("runOneStep-end");

      const p = performance.measure(
        "runOneStep",
        "runOneStep-start",
        "runOneStep-end"
      );
      last30RunOneStepTimes.push(p.duration);
      last30FrameDeltas.push(deltaMillis);
      if (last30RunOneStepTimes.length === 30) {
        console.log(
          `averages over the last 30 frames: runOneStep=${avg(
            last30RunOneStepTimes
          )}, frameDelta=${avg(last30FrameDeltas)}`
        );
        last30RunOneStepTimes = [];
        last30FrameDeltas = [];
      }

      previousFrameTime = time;
    }
    // Unconditionally request another callback, otherwise the animation could pause on its own.
    requestAnimationFrame(frameCallback);
  }
}

export function testRunPause() {
  test_data.playing = false;
}
*/
