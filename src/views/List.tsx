import {
  Accessor,
  Component,
  createEffect,
  createSignal,
  For,
  on,
  onCleanup,
} from "solid-js";
import { ReadonlyArray, sum } from "../data-structures/Arrays";
import type * as DustExpression from "../types/DustExpression";

import {
  BASE_CSS_CLASS,
  DustExpressionView,
  ExpressionProps,
} from "./DustExpressionView";
import { observeChildrenSizes } from "./ObserveChildren";

type ListLikeExpression =
  | DustExpression.FunctionCall
  | DustExpression.Array
  | DustExpression.Block;

export function isListLike(
  expression: DustExpression.Any
): expression is ListLikeExpression {
  return (
    expression.kind === "functionCall" ||
    expression.kind === "array" ||
    expression.kind === "block"
  );
}

export type ListProps = ExpressionProps<ListLikeExpression>;

function onSizesChanged(
  list: HTMLDivElement,
  children: readonly HTMLElement[]
) {
  const widths = children.map((it) => it.offsetWidth);
  const totalWidth = sum(widths);
  const maxWidth = Math.max(...widths);

  const heights = children.map((it) => it.offsetHeight);
  const totalHeight = sum(heights);
  const maxHeight = Math.max(...heights);

  const horizontalArea = totalWidth * maxHeight;
  const verticalArea = maxWidth * totalHeight;

  if (verticalArea < horizontalArea) {
    list.classList.add("vertical");
  } else {
    list.classList.remove("vertical");
  }
}

export const List: Component<ListProps> = (props) => {
  // const [isVertical, setIsVertical] = createSignal(false);

  function mountList(list: HTMLDivElement) {
    const cleanup = observeChildrenSizes(list, HTMLElement, onSizesChanged);
    onCleanup(cleanup);
  }

  createEffect(
    on(
      () => props.expression.totalLength,
      () => {
        // const boundingBox = listElement.getBoundingClientRect();
        // const maxWidth = boundingBox.height * 2;
        // TODO always calculate the area of both orientations and pick the smaller one.
        // if (boundingBox.width > maxWidth) {
        //   setIsVertical(true);
        // }
      }
    )
  );

  return (
    <div
      id={props.id}
      classList={{
        [BASE_CSS_CLASS]: true,
        [props.expression.kind]: true,
      }}
      ref={mountList}
    >
      <For each={props.expression.expressions}>
        {(expression, index) => (
          <DustExpressionView
            {...{
              ...props,
              id: props.id + "/expressions/" + index(),
              expression,
              depthLimit: props.depthLimit - 1,
            }}
          />
        )}
      </For>
    </div>
  );
};
