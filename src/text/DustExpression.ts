import { ReadonlyArray } from "../data-structures/Arrays";
import { assert } from "../development/Errors";
import { isOdd } from "../math/Numbers";

// TODO convert to JSON-schema or protobuf or some other cross-language format
// TODO define plain functions for everything below marked "getter" and remove the corresponding fields, that way expressions are trivially serializable to JSON.
export type DustExpression = Readonly<
  | DustDestructurableExpression
  | DustIfThenExpression
  | DustDeclarationExpression
  | DustBlockExpression
>;

export type DustLeafExpression = DustIdentifierExpression | DustTextExpression;

type BaseExpression = Readonly<{
  singleLine: boolean;
}>;

type ExpressionGroup = Readonly<{
  expressions: readonly DustExpression[];
}>;

export type DustDestructurableExpression =
  | DustIdentifierExpression
  | DustTextExpression
  | DustInterpolatedTextExpression
  | DustFunctionCallExpression
  | DustArrayExpression
  | DustModuleExpression;

export type DustTextExpression = BaseExpression &
  Readonly<{ kind: "text"; text: string }>;

export type DustInterpolatedTextExpression = BaseExpression &
  ExpressionGroup &
  Readonly<{ kind: "interpolatedText" }>;

export type DustArrayExpression = BaseExpression &
  ExpressionGroup &
  Readonly<{ kind: "array" }>;

export type DustModuleExpression = BaseExpression &
  ExpressionGroup &
  Readonly<{ kind: "module" }>;

export function moduleName(module: DustModuleExpression): DustExpression {
  return module.expressions[0];
}

export function modulePublicElements(
  module: DustModuleExpression,
): readonly DustExpression[] {
  const publicElements = module.expressions[1];
  assert(publicElements.kind === "array");
  return publicElements.expressions;
}

export function modulePrivateElements(
  module: DustModuleExpression,
): readonly DustExpression[] {
  const privateElements = module.expressions[2];
  assert(privateElements.kind === "array");
  return privateElements.expressions;
}

// export type ModuleElement = Readonly<{
//   expression: Declaration;
//   visibility: "public" | "private";
// TODO for now we don't worry about remembering positions in the plain text version: everything either starts centered on its parent or laid out top-to-bottom, and then springs apart.
// One option would be to store relative positions as laid out below:
// position: Position;

// export type Position = readonly PositionConstraint[];

// export type PositionConstraint = Readonly<{
//   kind: "above" | "below" | "before" | "after" | "centeredWithin";
//   relativeTo: "parent" | Identifier;
// }>;

// HOWEVER I think I a better option is to define a bijection between a 2D circle to a 1D list:
// When initially laying out elements in a module:
//    - Estimate the final size of the module based on the number of elements and the total number of characters and draw a circle with that size
//    - Position public elements evenly around the outside clockwise or counterclockwise (depending on language settings like LTR/RTL), with the first one at the very top. Once the physics simulation takes over, elements should end up in a deterministic location.
//    - Draw the largest concentric circle that doesn't overlap any public elements
//    - Lay out private elements in a spiral (again cw or ccw depending on LTR/RTL) starting from the top and spiraling towards the center.
//
// As elements move around, we have to do the inverse: unroll the public circle and the private spiral into their respective 1D lists
// }>;

export type DustBlockExpression = BaseExpression &
  ExpressionGroup &
  Readonly<{ kind: "block" }>;

export type DustIdentifierExpression = BaseExpression &
  Readonly<{
    kind: "identifier";
    identifier: string;
  }>;

export type DustFunctionCallExpression = BaseExpression &
  ExpressionGroup &
  Readonly<{
    kind: "functionCall";
    functionKind: "prefix" | "binary" | "punctuation"; // TODO handle punctuation
  }>;
// TODO getFunction(DustFunctionCallExpression), getOperands(DustFunctionCallExpression)

// (if <expr> then <expr>)
// (if <expr> then <expr> else <expr>)
// (
//   if <expr> then <expr>
//   if <expr> then <expr>
//             else <expr>
// )
export type DustIfThenExpression = BaseExpression &
  ExpressionGroup &
  Readonly<{ kind: "ifThen" }>;

export type DustIfThenBranch = Readonly<{
  condition: DustExpression;
  result: DustExpression;
}>;

export function getIfThenBranches({
  expressions,
}: DustIfThenExpression): ReadonlyArray<DustIfThenBranch> {
  if (expressions.length < 4 || isOdd(expressions.length)) {
    throw `If expression must have an even number of terms and at least 4 terms, got ${expressions.length}`;
  }
  let cases: DustIfThenBranch[] = [];
  for (let index = 0; index < expressions.length; index += 4) {
    const ifToken = expressions[index];
    const condition = expressions[index + 1];
    const thenToken = expressions[index + 2];
    const result = expressions[index + 3];

    assert(isIdentifierEqualTo(ifToken, "if"), "Expected 'if', got", ifToken);
    assert(
      isIdentifierEqualTo(thenToken, "then"),
      "Expected 'then', got",
      thenToken,
    );

    cases.push({ condition, result });
  }
  return cases; // TODO return a live ReadonlyArray
}

export function getElseBranch({
  expressions,
}: DustIfThenExpression): DustExpression | undefined {
  const length = expressions.length;
  const nextToLast = expressions[length - 2]!;
  return isIdentifierEqualTo(nextToLast, "else")
    ? expressions[length - 1]!
    : undefined;
}

function isIdentifierEqualTo(expression: DustExpression, identifier: string) {
  return (
    expression.kind === "identifier" && expression.identifier === identifier
  );
}

export type DustDeclarationExpression = BaseExpression &
  ExpressionGroup &
  Readonly<{ kind: "declaration" }>;

// getter: returns the first expression, e.g. foo or (foo bar baz) or [a, b, c]
export function getDeclarationPattern(
  expression: DustDeclarationExpression,
): DustDestructurableExpression {
  // TODO assert that it's actually destructurable
  return expression.expressions[0] as DustDestructurableExpression;
}

// getter: returns the third expression if the second expression is a ":", else undefined
export function getDeclarationConstraints(
  expression: DustDeclarationExpression,
): DustExpression | undefined {
  if (expression.expressions.length === 1) {
    return undefined;
  }
  assert(expression.expressions.length >= 3);
  const second = expression.expressions[1];
  assert(second.kind === "identifier");
  if (second.identifier === ":") {
    return expression.expressions[2];
  }
}

// getter: returns the last expression if the second-to-last expression is a "=", else undefined
export function getDeclarationValue(
  expression: DustDeclarationExpression,
): DustExpression | undefined {
  if (expression.expressions.length === 1) {
    return undefined;
  }
  const nextToLast = expression.expressions.at(-2)!;
  assert(nextToLast.kind === "identifier");
  if (nextToLast.identifier === "=") {
    return expression.expressions.at(-1)!;
  }
}
