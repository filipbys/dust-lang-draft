import { Component, For } from "solid-js";
import type * as DustExpression from "./DustExpression";

export type EventCallback<T extends Element> = (this: T, ev: Event) => any;

export type Callbacks = Readonly<{
  onInput: EventCallback<HTMLSpanElement>;
  onKeyDown: EventCallback<HTMLSpanElement>;
  onFocusIn: EventCallback<HTMLElement>;
  onFocusOut: EventCallback<HTMLElement>;
  onGroupClicked: EventCallback<HTMLDivElement>;
}>;

export const DustExpressionView: Component<{
  expression: DustExpression.Any;
  id: string;
  depthLimit: number;
}> = (props) => {
  console.log(`Creating DustExpressionView:`, props);
  const expression = props.expression;
  const kind = expression.kind;

  if (kind === "identifier") {
    return (
      <span id={props.id} class="Dust identifier" tabIndex="0">
        {expression.identifier}
      </span>
    );
  } else if (props.depthLimit <= 0) {
    return DepthLimitPlaceholder(props);
  } else if (kind === "functionCall") {
    // TODO consider using MathJAX for math expressions https://www.mathjax.org/
    return FunctionCall({ functionCall: expression, ...props });
  } else if (kind === "array" || kind === "block") {
    return List({ kind, expressions: expression.expressions, ...props });
  } else if (kind === "declaration") {
    throw "TODO";
  }
  throw `Unrecognized expression kind ${kind}`; // TODO return a special error element instead!
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

const FunctionCall: Component<{
  functionCall: DustExpression.FunctionCall;
  id: string;
  depthLimit: number;
}> = (props) => {
  // TODO check for special functions like 'tuple' and 'module' which produce totally different html

  return (
    <div
      class={`Dust ${props.functionCall.functionKind} functionCall`}
      id={props.id}
    >
      <For each={props.functionCall.expressions}>
        {(expression, index) => (
          <DustExpressionView
            expression={expression}
            id={props.id + "/expressions/" + index()}
            depthLimit={props.depthLimit - 1}
          />
        )}
      </For>
    </div>
  );
};

const List: Component<{
  kind: "array" | "block";
  expressions: readonly DustExpression.Any[];
  id: string;
  depthLimit: number;
}> = (props) => {
  return (
    <div class={`Dust ${props.kind}`} id={props.id}>
      <For each={props.expressions}>
        {(expression, index) => (
          <DustExpressionView
            expression={expression}
            id={props.id + "/expressions/" + index()}
            depthLimit={props.depthLimit - 1}
          />
        )}
      </For>
    </div>
  );
};
