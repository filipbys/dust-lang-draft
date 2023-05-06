export function raise(error: string): never {
  throw new Error(error);
}

export function logAndThrow(message: string, ...data: any[]): never {
  console.warn(message, ...data);
  throw new Error(message);
}

export function assert(condition: boolean, ...data: any[]): asserts condition {
  console.assert(condition, ...data);
  if (!condition) {
    throw new Error("AssertionError");
  }
}
