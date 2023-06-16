export function setAttributeIfChanged(
  element: Element,
  qualifiedName: string,
  value: string,
) {
  // Avoid triggering mutationobservers if nothing changed
  if (element.getAttribute(qualifiedName) !== value) {
    element.setAttribute(qualifiedName, value);
  }
}
