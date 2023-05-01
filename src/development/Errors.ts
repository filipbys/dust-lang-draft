export function raise(error: string): never {
  throw new Error(error);
}

export function logAndThrow(message: string, ...data: any[]): never {
  console.warn(message, ...data);
  throw new Error(message);
}
