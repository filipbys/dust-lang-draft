export class RollingAverage {
  readonly #numbers: number[];
  #nextIndex = 0;
  #rollingSum = 0;
  #isSaturated = false;

  constructor(length: number) {
    if (length < 1) {
      throw new RangeError(`length must be >= 1, got ${length}`);
    }
    this.#numbers = new Array(length).fill(0);
  }

  clear() {
    this.#numbers.fill(0);
    this.#nextIndex = 0;
    this.#rollingSum = 0;
    this.#isSaturated = false;
  }

  add(value: number) {
    this.#rollingSum += value - this.#numbers[this.#nextIndex];
    this.#numbers[this.#nextIndex] = value;
    this.#nextIndex++;
    if (this.#nextIndex === this.#numbers.length) {
      this.#nextIndex = 0;
      this.#isSaturated = true;
    }
  }

  get isSaturated() {
    return this.#isSaturated;
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
