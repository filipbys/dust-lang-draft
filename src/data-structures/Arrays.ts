export interface ReadonlyArray<T> {
  readonly length: number;
  readonly [n: number]: T;
  [Symbol.iterator](): Iterator<T>;
}

export function addElementIfAbsent<T>(
  array: T[],
  element: T,
  description?: string
): boolean {
  if (!array.includes(element)) {
    array.push(element);
    if (description) {
      console.log(`Added ${description} element`, element);
    }
    return true;
  }
  if (description) {
    console.warn(`${description} element already present`, element);
  }
  return false;
}

export function removeElementIfPresent<T>(
  array: T[],
  element: T,
  description?: string
): boolean {
  if (array.includes(element)) {
    array.splice(array.indexOf(element), 1);
    if (description) {
      console.log(`Removed ${description} element`, element);
    }
    return true;
  }
  if (description) {
    console.warn(`${description} element not found`, element);
  }
  return false;
}
