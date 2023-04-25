export function addElementIfAbsent<T>(
  array: T[],
  element: T,
  logMessage?: string
): boolean {
  if (!array.includes(element)) {
    array.push(element);
    if (logMessage) {
      console.log(`${logMessage}: added element`, element);
    }
    return true;
  }
  if (logMessage) {
    console.warn(`${logMessage}: element already present`, element);
  }
  return false;
}

export function removeElementIfPresent<T>(
  array: T[],
  element: T,
  logMessage?: string
): boolean {
  if (array.includes(element)) {
    array.splice(array.indexOf(element), 1);
    if (logMessage) {
      console.log(`${logMessage}: removed element`, element);
    }
    return true;
  }
  if (logMessage) {
    console.warn(`${logMessage}: element not found`, element);
  }
  return false;
}
