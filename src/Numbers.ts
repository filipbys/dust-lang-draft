export function clamp(min: number, value: number, max: number): number {
  // return value
  // TODO
  return Math.min(Math.max(min, value), max);
}

export function roundToString(num: number, fractionDigits: number = 0): string {
  const result = num.toFixed(fractionDigits);
  if (result.startsWith("-0")) {
    return result.slice(1);
  }
  return result;
}
