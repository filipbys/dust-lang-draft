// Interface for types that can be used with "instanceof"
export interface TypeConstructor<T> extends Function {
  prototype: T;
}

export function assertIsInstance<T>(
  value: any,
  typeConstructor: TypeConstructor<T>
): value is T {
  if (!(value instanceof typeConstructor)) {
    throw TypeError(
      `Expected a value of type ${typeConstructor}, got ${value}`
    );
  }
  return true;
}

export function safeCast<T>(
  value: any,
  typeConstructor: TypeConstructor<T>
): T {
  assertIsInstance(value, typeConstructor);
  return value;
}
