import { Circle } from "../math/Geometry";
import { Vector2D } from "../math/Vectors";

export class HTMLCircleElement extends HTMLElement implements Circle {
  center: Readonly<Vector2D> = [0, 0];
  diameter: number = 10;
}
