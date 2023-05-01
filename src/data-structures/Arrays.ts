import { TypeConstructor } from "../type-utils/DynamicTypeChecks";

export interface ReadonlyArray<T> {
  readonly length: number;
  readonly [n: number]: T;
  [Symbol.iterator](): Iterator<T>;
}

export function sum(array: ReadonlyArray<number>): number {
  let total = 0;
  for (const num of array) {
    total += num;
  }
  return total;
}

export function filterByType<T, U>(
  array: ReadonlyArray<T>,
  typeConstructor: TypeConstructor<U>,
): U[] {
  const result: U[] = [];
  for (const element of array) {
    if (element instanceof typeConstructor) {
      result.push(element);
    }
  }
  return result;
}

export function forEachPair<T>(
  array: ReadonlyArray<T>,
  callbackfn: (first: T, second: T) => void,
) {
  for (let i = 0; i < array.length; i++) {
    for (let j = i + 1; j < array.length; j++) {
      callbackfn(array[i], array[j]);
    }
  }
}

export function addElementIfAbsent<T>(
  array: T[],
  element: T,
  description?: string,
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
  description?: string,
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
