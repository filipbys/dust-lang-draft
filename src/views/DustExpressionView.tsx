import { Component, Match, Switch } from "solid-js";
import type * as DustExpression from "../types/DustExpression";
import { isListLike, List, ListProps } from "./List";
import { Module, ModuleProps } from "./Module";

export const BASE_CSS_CLASS = "Dust";

export type EventCallback<T extends Element, E> = (this: T, ev: E) => any;

export interface DustComponentProps {
  readonly id: string; // TODO add a data-json-path to each element instead of using id? Unless we want to be able to query any element by id...
  readonly depthLimit: number;
  readonly onFocusIn?: EventCallback<HTMLSpanElement, FocusEvent>;
  readonly onFocusOut?: EventCallback<HTMLSpanElement, FocusEvent>;
}

export interface ExpressionProps<
  T extends DustExpression.Any = DustExpression.Any,
> extends DustComponentProps {
  readonly expression: T;
  readonly playSimulation: () => void;
}

// TODO make a note of https://prettier.io/docs/en/rationale.html#%EF%B8%8F-a-note-on-formatting-reversibility
//  -> That's the sort of issue we're trying to avoid with Dust

// TODO solid might not be the best fit for specifically this part.
// Solid seems great for more flat UIs, but for deep trees like this it might be better to fall back to vanilla JSl custom elements, and mutationobserver.
// Main reason: we want to be able to unroll the recursion into a loop so that the callstack doesn't get insane.
// We can keep the linked dom subtrees in sink using mutationobservers and json patch: whether or not we use Solid, we need to be able to convert patches to the TextTree into patches to the DustExpression tree, and in turn into patches to the DOM tree, and the other way around:
// TextTreePatch (JSONPatch) <----> DustExpressionPatch (JSONPatch) <---> DOMPatch (MutationRecord[])
// textTreePatchToExpressionPatch(patch: TextTreePatch): DustExpressionPatch
// -> internally uses a private function for brand new subtrees: textTreeToExpression(tree: TextTree): DustExpression
// expressionPatchToDOMPatch(patch: DustExpressionPatch): MutationRecord[]
// -> internally uses a private function for brand new subtrees: expressionToHTML(expr: DustExpression): HTMLElement
export const DustExpressionView: Component<ExpressionProps> = (props) => (
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
    <Match when={props.expression.kind === "module"}>
      <Module {...(props as ModuleProps)} />
    </Match>
  </Switch>
);

type IdentifierProps = ExpressionProps<DustExpression.Identifier>;
const Identifier: Component<IdentifierProps> = (props) => (
  <span
    id={props.id}
    classList={{
      [BASE_CSS_CLASS]: true,
      [props.expression.kind]: true,
    }}
    tabIndex="0"
    onFocusIn={props.onFocusIn}
    onFocusOut={props.onFocusOut}
  >
    {props.expression.identifier}
  </span>
);

// TODO use <Show when={}></Show> for this instead. Every DustExpressionView should be a <Show>
// TODO also try to use <Show> to hide elements that go off screen and check if that helps memory usage.
const DepthLimitPlaceholder: Component<{}> = (props) => {
  function expand(this: HTMLSpanElement, event: Event) {
    // TODO expand the expression on click
    // this.replaceWith(expressionToHTML(expression, span.id, 1, callbacks))
  }
  return <span onClick={expand}>...</span>;
};
