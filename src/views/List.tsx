import { Component, For } from "solid-js";
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
  expression: DustExpression.Any,
): expression is ListLikeExpression {
  return (
    expression.kind === "functionCall" ||
    expression.kind === "array" ||
    expression.kind === "block"
  );
}

export type ListProps = ExpressionProps<ListLikeExpression>;

export const List: Component<ListProps> = (props) => (
  <div
    id={props.id}
    classList={{
      [BASE_CSS_CLASS]: true,
      [props.expression.kind]: true,
      [getFunctionKindOrEmptyString(props.expression)]: true,
      singleLine: props.expression.singleLine,
    }}
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

function getFunctionKindOrEmptyString(expression: ListLikeExpression) {
  return expression.kind === "functionCall" ? expression.functionKind : "";
}
