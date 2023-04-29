import { Accessor, Component, createEffect, createSignal, For, on } from "solid-js";
import type * as DustExpression from "../types/DustExpression";

import {
  BASE_CSS_CLASS,
  DustExpressionView,
  ExpressionProps,
} from "./DustExpressionView";

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

export const List: Component<ListProps> = (props) => {
  const [isVertical, setIsVertical] = createSignal(false);
  let listElement: HTMLDivElement;

  createEffect(
    on(
      () => props.expression.totalLength,
      () => {
        console.log("effect is running!!!");
        const boundingBox = listElement.getBoundingClientRect();

        const maxWidth = boundingBox.height * 2;

        // TODO also always calculate the area of both orientations and pick the smaller one.
        if (boundingBox.width > maxWidth) {
          setIsVertical(true);
        }
      }
    )
  );

  return (
    <div
      id={props.id}
      classList={{
        [BASE_CSS_CLASS]: true,
        [props.expression.kind]: true,
        vertical: isVertical(),
      }}
      ref={listElement!}
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
