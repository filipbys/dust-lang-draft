import type * as DustExpression from "./types/DustExpression";
import { MAX_HORIZONTAL_LENGTH } from "./text/TextTree";

export type EventCallback<T extends Element> = (this: T, ev: Event) => any;

export type Callbacks = Readonly<{
  onInput: EventCallback<HTMLSpanElement>;
  onKeyDown: EventCallback<HTMLSpanElement>;
  onFocusIn: EventCallback<HTMLElement>;
  onFocusOut: EventCallback<HTMLElement>;
  onGroupClicked: EventCallback<HTMLDivElement>;
}>;

// TODO make a note of https://prettier.io/docs/en/rationale.html#%EF%B8%8F-a-note-on-formatting-reversibility
//  -> That's the sort of issue we're trying to avoid with Dust
function isVertical(expression: DustExpression.Any): boolean {
  // TODO this breaks down for complex layouts like if/then, graphs, trees, etc
  return expression.totalLength > MAX_HORIZONTAL_LENGTH;
}

export function expressionToHTML(
  expression: DustExpression.Any,
  id: string,
  depthLimit: number,
  callbacks: Callbacks
): HTMLElement {
  const kind = expression.kind;

  if (kind === "identifier") {
    return Identifier.toHTML(expression, id, callbacks);
  } else if (depthLimit <= 0) {
    return depthLimitPlaceholder(expression, id, callbacks);
  } else if (kind === "functionCall") {
    // TODO consider using MathJAX for math expressions https://www.mathjax.org/
    return FunctionCall.toHTML(expression, id, depthLimit, callbacks);
  } else if (kind === "array" || kind === "block") {
    return Lists.toHTML(expression, id, depthLimit, callbacks);
  } else if (kind === "declaration") {
    throw "TODO";
  }
  throw `Unrecognized expression kind ${kind}`; // TODO return a special error element instead!
}

function initializeElement(
  element: HTMLElement,
  expression: DustExpression.Any,
  id: string,
  callbacks: Callbacks
) {
  element.id = id; // TODO ensure this is a valid Json Patch Pointer
  element.classList.add("Dust", expression.kind);
  if (isVertical(expression)) {
    // TODO this shouldn't apply to all expressions, mostly just function calls and arrays
    element.classList.add("vertical");
  }

  element.addEventListener("focusin", callbacks.onFocusIn);
  element.addEventListener("focusout", callbacks.onFocusOut);
  element.tabIndex = 0;

  // TODO use IntersectionObserver to minimize elements that are out of view in order to remove
  // unnecessary DOM nodes. Elements thatf come back into view should re-expand automatically.
}

function depthLimitPlaceholder(
  expression: DustExpression.Any,
  id: string,
  callbacks: Callbacks
): HTMLElement {
  return make("span", (span) => {
    initializeElement(span, expression, id, callbacks);
    span.textContent = "...";
    span.addEventListener("click", () =>
      span.replaceWith(expressionToHTML(expression, span.id, 1, callbacks))
    );
  });
}

// NB on 'transform' vs 'parallel-transform'
// ( $TransformProgress $State =
//   ( one-of
//     ($Continue State) <<Continue processing the rest of the sequence>>
//     ($Stop State) <<Stop processing and return the given state>>
//   )
// )
// ( $transform
//   ($sequence : Sequence $Item) <<can be an infinite sequence>>
//   ($initial-state : $State)
//   (($process Item State) : (TransformProgress State))
//   : State
// )
// ( $parallel-transform
//   ($sequence : RandomAccessSequence $Item) <<must be random-access so we can divide it into smaller parts for multiple workers>>
//   ($default-state : $State) <<unlike in the regular transform's initial-state, this can be passed to multiple workers>>
//   (($process Item State : (TransformProgress State)) <<one-by one, like in the regular transform>>
//   (($combine (TransformProgress State) (TransformProgress State) : (TransformProgress State)) <<combine two results from multiple workers>>
//   : State
// )

namespace Module {
  
}



namespace FunctionCall {
  export function toHTML(
    functionCall: DustExpression.FunctionCall,
    id: string,
    depthLimit: number,
    callbacks: Callbacks
  ): HTMLDivElement {
    // TODO check for special functions like 'tuple' and 'module' which produce totally different html

    const functionKind = functionCall.functionKind;
    const expressions = functionCall.expressions;

    const elements = Lists.mapToHTML(expressions, id, depthLimit, callbacks);

    return make("div", (div) => {
      initializeElement(div, functionCall, id, callbacks);
      div.classList.add(functionKind);
      if (functionKind === "prefix") {
        elements.forEach((element, index) => {
          if (index === 0) {
            element.classList.add("function");
          } else {
            element.classList.add("parameter");
          }
        });
        div.append(...elements);
      } else if (functionKind === "binary") {
        if (elements.length % 2 === 0) {
          throw `Binary function call must have an odd number of elements, got: ${JSON.stringify(
            functionCall
          )}`;
        }

        const firstParameter = elements[0];
        firstParameter.classList.add("parameter");
        div.append(firstParameter);

        for (let index = 1; index < elements.length; index += 2) {
          const binaryFunction = elements[index];
          const parameter = elements[index + 1];
          parameter.classList.add("parameter");
          binaryFunction.classList.add("function");
          div.append(binaryFunction, parameter);
        }
      } else {
        throw `Unknown functionCall kind ${functionKind}`;
      }
    });
  }
}

namespace Lists {
  export function mapToHTML(
    expressions: readonly DustExpression.Any[],
    id: string,
    depthLimit: number,
    callbacks: Callbacks
  ) {
    const subExpressionIdPrefix = id + "/expressions/";
    const subExpressionDepthLimit = depthLimit - 1;
    return expressions.map((expression, index) =>
      expressionToHTML(
        expression,
        subExpressionIdPrefix + index,
        subExpressionDepthLimit,
        callbacks
      )
    );
  }

  export function toHTML(
    expression: DustExpression.Array | DustExpression.Block,
    id: string,
    depthLimit: number,
    callbacks: Callbacks
  ): HTMLDivElement {
    // TODO make it draggable
    // with .draggable it makes divs draggable but then text is no longer selectable
    // without .draggable, text is selectable but not across spans or divs

    // TODO all elements should be the same height for horizontal, or same width for vertical
    return make("div", (div) => {
      initializeElement(div, expression, id, callbacks);
      div.append(
        ...mapToHTML(expression.expressions, id, depthLimit, callbacks)
      );
      div.addEventListener("click", callbacks.onGroupClicked);
    });
  }
}

function make<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  initialize: (element: HTMLElementTagNameMap[K]) => void = (_) => {}
): HTMLElementTagNameMap[K] {
  const element: HTMLElementTagNameMap[K] = document.createElement(tagName);
  initialize(element);
  return element;
}
