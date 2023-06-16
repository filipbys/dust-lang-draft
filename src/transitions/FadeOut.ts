export function fadeOut(
  element: HTMLElement,
  durationMillis: number,
  doneCallback: () => void,
): number /* timeout ID */ {
  element.style.transition = `opacity ${durationMillis}ms ease`;
  element.style.opacity = "0";
  return setTimeout(doneCallback, durationMillis);
}

export function fadeOutAndRemove(
  element: HTMLElement,
  durationMillis: number,
): number /* timeout ID */ {
  return fadeOut(element, durationMillis, () => element.remove());
}
