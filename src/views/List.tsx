import { Component, For } from "solid-js";
import type * as DustExpression from "../types/DustExpression";

import {
  computeCssClass,
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

export const List: Component<ListProps> = (props) => (
  <div id={props.id} class={computeListLikeCssClass(props.expression)}>
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

function computeListLikeCssClass(expression: ListLikeExpression) {
  if (expression.kind === "functionCall") {
    return computeCssClass(expression, expression.functionKind);
  }
  return computeCssClass(expression);
}
