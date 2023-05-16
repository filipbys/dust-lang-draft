// Interface for types that can be used with "instanceof"
export interface TypeConstructor<T> extends Function {
  prototype: T;
}

export function assertIsInstance<T>(
  value: any,
  typeConstructor: TypeConstructor<T>,
): asserts value is T {
  if (!(value instanceof typeConstructor)) {
    throw TypeError(
      `Expected a value of type ${typeConstructor}, got ${value}`,
    );
  }
}

export function safeCast<T>(
  value: any,
  typeConstructor: TypeConstructor<T>,
): T {
  assertIsInstance(value, typeConstructor);
  return value;
}

export function tryCast<T>(
  value: any,
  typeConstructor: TypeConstructor<T>,
): T | null {
  return value instanceof typeConstructor ? value : null;
}
