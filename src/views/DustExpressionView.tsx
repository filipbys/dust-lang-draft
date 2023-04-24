import { Component, For, Match, Switch } from "solid-js";
import type * as DustExpression from "../types/DustExpression";

const BASE_CSS_CLASS = "Dust";

function computeCssClass(
  expression: DustExpression.Any,
  ...additional: readonly string[]
): string {
  return [BASE_CSS_CLASS, expression.kind, ...additional].join(" ");
}

export type EventCallback<T extends Element, E extends Event> = (
  this: T,
  ev: E
) => any;

export interface ExpressionProps<
  T extends DustExpression.Any = DustExpression.Any
> {
  readonly id: string; // TODO add a data-json-path to each element instead of using id? Unless we want to be able to query any element by id...
  readonly expression: T;
  readonly depthLimit: number;
  readonly onFocusIn?: EventCallback<HTMLSpanElement, FocusEvent>;
  readonly onFocusOut?: EventCallback<HTMLSpanElement, FocusEvent>;
  readonly onInput?: EventCallback<HTMLSpanElement, InputEvent>;
}

// TODO add the "vertical" class where needed, BUT ALSO
// TODO make a note of https://prettier.io/docs/en/rationale.html#%EF%B8%8F-a-note-on-formatting-reversibility
//  -> That's the sort of issue we're trying to avoid with Dust

export const DustExpressionView: Component<ExpressionProps> = (props) => {
  return (
    <Switch
      fallback={
        <div>Unrecognized Dust expression kind {props.expression.kind}</div>
      }
    >
      <Match when={props.expression.kind === "identifier"}>
        <Identifier {...(props as IdentifierProps)} />
      </Match>
      <Match when={props.depthLimit <= 0}>
        <DepthLimitPlaceholder />
      </Match>
      <Match when={isListLike(props.expression)}>
        <List {...(props as ListProps)} />
      </Match>
    </Switch>
  );
};

type IdentifierProps = ExpressionProps<DustExpression.Identifier>;
const Identifier: Component<IdentifierProps> = (props) => {
  return (
    <span
      id={props.id}
      class={computeCssClass(props.expression)}
      tabIndex="0"
      onFocusIn={props.onFocusIn}
      onFocusOut={props.onFocusOut}
      contentEditable={props.onInput !== undefined}
      onInput={props.onInput}
    >
      {props.expression.identifier}
    </span>
  );
};

// TODO use <Show when={}></Show> for this instead. Every DustExpressionView should be a <Show>
// TODO also try to use <Show> to hide elements that go off screen and check if that helps memory usage.
const DepthLimitPlaceholder: Component<{}> = (props) => {
  function expand(this: HTMLSpanElement, event: Event) {
    // TODO expand the expression on click
    // this.replaceWith(expressionToHTML(expression, span.id, 1, callbacks))
  }
  return <span onClick={expand}>...</span>;
};

type ListLikeExpression =
  | DustExpression.FunctionCall
  | DustExpression.Array
  | DustExpression.Block;

function isListLike(
  expression: DustExpression.Any
): expression is ListLikeExpression {
  return (
    expression.kind === "functionCall" ||
    expression.kind === "array" ||
    expression.kind === "block"
  );
}

type ListProps = ExpressionProps<ListLikeExpression>;

const List: Component<ListProps> = (props) => {
  // TODO check for special functions like 'tuple' and 'module' which produce totally different html

  return (
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
};

function computeListLikeCssClass(expression: ListLikeExpression) {
  if (expression.kind === "functionCall") {
    return computeCssClass(expression, expression.functionKind);
  }
  return computeCssClass(expression);
}
