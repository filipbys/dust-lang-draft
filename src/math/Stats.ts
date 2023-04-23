export class RollingAverage {
  readonly #numbers: number[];
  #nextIndex: number = 0;
  #rollingSum: number = 0;

  constructor(length: number) {
    if (length < 1) {
      throw new RangeError(`length must be >= 1, got ${length}`);
    }
    this.#numbers = new Array(length).fill(0);
  }

  add(value: number) {
    this.#rollingSum += value - this.#numbers[this.#nextIndex];
    this.#numbers[this.#nextIndex] = value;
    this.#nextIndex = (this.#nextIndex + 1) % this.#numbers.length;
  }

  average() {
    return this.#rollingSum / this.#numbers.length;
  }
}

// export function sum(numbers: readonly number[]): number {
//     return numbers.reduce((a, b) => a + b)
// }

// export function average(numbers: readonly number[]) {
//     return sum(numbers) / Math.max(1, numbers.length)
// }
