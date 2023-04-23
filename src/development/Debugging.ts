import { roundToString } from "./Numbers";
import { vectorToString } from "./Vectors";
import type { PhysicsElement } from "./Physics";

export function updateElementText(
  element: PhysicsElement,
  energy: number = element.kineticEnergy
) {
  const debugInfo = element.htmlElement.querySelector("#debug_info");
  if (debugInfo === null) {
    return;
  }
  const s = element.state;
  const f = vectorToString(element.force);
  const v = vectorToString(element.velocity, 2);
  const c = vectorToString(element.center);
  const ke = roundToString(energy);
  debugInfo.textContent = `s = ${s}, f = ${f}, v = ${v}, c = ${c}, k_e = ${ke}`;
}
