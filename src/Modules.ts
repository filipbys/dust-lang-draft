import { updateElementText } from "./Debugging";
import { makeDraggable } from "./DragAndDrop";
import { raise } from "./Errors";
import { PhysicsElement, Springs } from "./Physics";
import { RollingAverage } from "./Stats";

// TODO create a similar simulation for unordered containers/collections which has only public elements and just distributes them as evenly as possible
// ==> Extract shared code between them into other namespaces:
//      - vector math
//      - spring force math
//      - drag and drop
//      - pinning

// TODO extract a component with inputs for changing various forces (e.g. setting forces to zero to turn them off)

// export type DustModule = {
//   htmlElement: HTMLElement;
// };

// function createModule(moduleElements: HTMLElement[]): DustModule {
//   return {
//     htmlElement: div("module", moduleElements), // TODO
//   };
// }

export class Simulation {
  readonly moduleElement: PhysicsElement;
  readonly moduleName: PhysicsElement;
  #physicsElements: PhysicsElement[] = [];
  get physicsElements() {
    return this.#physicsElements;
  }
  #playing: boolean = false;
  get playing() {
    return this.#playing;
  }

  constructor(
    moduleHTMLElement: HTMLElement,
    moduleNameHTMLElement: HTMLElement
  ) {
    this.moduleElement = new PhysicsElement({
      htmlElement: moduleHTMLElement,
      state: "pinned",
    });
    this.moduleName = new PhysicsElement({
      htmlElement: moduleNameHTMLElement,
      state: "pinned",
      centeredWithinParent: true,
    });
  }

  addElement(htmlElement: HTMLElement) {
    this.#physicsElements.push(
      new PhysicsElement({
        htmlElement,
        state: "free",
        centeredWithinParent: true,
        // TODO make it remember the center position for each element. For now everything starts at the center and springs apart.
      })
    );
  }

  removeElement(htmlElement: HTMLElement) {
    this.#physicsElements = this.#physicsElements.filter(
      (element) => element.htmlElement !== htmlElement
    );
  }

  play() {
    this.#playing = true;
    playSimulation(this);
  }

  pause() {
    this.#playing = false; // will stop on next frame callback
  }
}

function playSimulation(simulation: Simulation) {
  requestAnimationFrame(frameCallback);

  let previousFrameTime: DOMHighResTimeStamp | undefined = undefined;

  let runOneStepPerformance = new RollingAverage(30);
  let frameDelta = new RollingAverage(30);
  let debugFrameCounter = 0;

  function frameCallback(time: DOMHighResTimeStamp) {
    if (previousFrameTime === undefined) {
      // first frame
      runOneStep(simulation, 16);
      previousFrameTime = time;
      requestAnimationFrame(frameCallback);
      return;
    }
    if (!simulation.playing) {
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
      runOneStepPerformance.add(p.duration);
      frameDelta.add(deltaMillis);
      debugFrameCounter++;
      if (debugFrameCounter === 30) {
        console.log(
          `averages over the last 30 frames: runOneStep=${runOneStepPerformance.average()}, frameDelta=${frameDelta.average()}`
        );
        debugFrameCounter = 0;
      }

      previousFrameTime = time;
    }
    // Unconditionally request another callback, otherwise the animation could pause on its own.
    requestAnimationFrame(frameCallback);
  }
}

function runOneStep(
  { moduleElement, moduleName, physicsElements }: Simulation,
  deltaMillis: number
) {
  const dragMultiplier = 0.995;
  const frictionCoefficient = 0.01;

  const idealGapBetweenElements = 20;

  const collisionSpringConstant = 100; // 1/(millis^2): strongly repel colliding elements

  const spreadSpringConstant = 0.25; // gently spread all elements away from all others

  const publicElementsToBorderSpringConstant = 100; // Strongly pull towards the module's border
  const privateElementsToCenterSpringConstant = 20; // Strongly pull toowards the center

  let sumOfPublicElementGapsToBorder = 0;
  let sumOfPrivateElementGapsToBorder = 0;

  moduleElement.force.x = 0;
  moduleElement.force.y = 0;
  moduleName.force.x = 0;
  moduleName.force.y = 0;
  for (const element of physicsElements) {
    element.force.x = 0;
    element.force.y = 0;

    Springs.preventCollisions(element, moduleName, collisionSpringConstant);
    if (element.htmlElement.classList.contains("public")) {
      const idealGap = -element.diameter;
      Springs.connectBorders(
        element,
        moduleElement,
        publicElementsToBorderSpringConstant,
        idealGap
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
        moduleName,
        privateElementsToCenterSpringConstant,
        idealGapBetweenElements
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

  let totalEnergy = 0;
  for (const element of physicsElements) {
    element.updateVelocityAndPositionIfNeeded(
      dragMultiplier,
      frictionCoefficient,
      deltaMillis
    );

    totalEnergy += element.kineticEnergy;
    updateElementText(element);
  }
  // TODO show the total force on the moduleElement as well. moduleName forces should be just from collisions
  // TODO calculate average overlap between elements, as well as average distance of public/private elements to border
  updateElementText(moduleName, totalEnergy);

  // TODO use these to grow/shrink the module automatically
  // TODO calculate module area and compare it to sum of element areas
  // console.log(`runOneStep end: deltaMillis=${deltaMillis} sumOfGapsBetweenElements=${sumOfGapsBetweenElements}, sumOfGapsBetweenOverlappingElements=${sumOfGapsBetweenOverlappingElements}, sumOfPublicElementGapsToBorder=${sumOfPublicElementGapsToBorder}, sumOfPrivateElementGapsToBorder=${sumOfPrivateElementGapsToBorder}`)

  // TODO use average distance of public elements to border to grow/shrink the module
  // also grow the module if any private elements end up touching the border
}

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
