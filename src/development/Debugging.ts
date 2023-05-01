import { roundToString } from "../math/Numbers";
import { vectorToString } from "../math/Vectors";
import { kineticEnergy } from "../math/Physics";
import { HTMLPhysicsSimulationElement } from "../simulations/HTMLPhysicsSimulationElement";

export function updateElementText(
  element: HTMLPhysicsSimulationElement,
  energy: number = kineticEnergy(element),
) {
  const debugInfo = element.querySelector("#debug_info");
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
