import type { TextNode, TextGroupType } from "./TextTree";
import type * as DustExpression from "../types/DustExpression";

export function unparseExpression(expression: DustExpression.Any): TextNode {
  const kind = expression.kind;
  if (kind === "identifier") {
    return { kind: "leaf", text: expression.identifier };
  } else if (kind === "declaration") {
    return unparseDeclaration(expression);
  } else if (kind === "functionCall") {
    return unparseGroup("()", expression.expressions, expression.singleLine);
  } else if (kind === "array") {
    return unparseGroup("[]", expression.expressions, expression.singleLine);
  } else if (kind === "block") {
    return unparseGroup("{}", expression.expressions, expression.singleLine);
  }
  throw `Unrecognized expression kind ${kind}`;
}

const COLON: TextNode = { kind: "leaf", text: ":" };
const EQUALS: TextNode = { kind: "leaf", text: "=" };

function unparseDeclaration(declaration: DustExpression.Declaration): TextNode {
  const pattern = unparseExpression(declaration.pattern);
  if (!declaration.constraints && !declaration.value) {
    return pattern;
  }
  const nodes: TextNode[] = [pattern];
  if (declaration.constraints) {
    nodes.push(COLON, unparseExpression(declaration.constraints));
  }
  if (declaration.value) {
    nodes.push(EQUALS, unparseExpression(declaration.value));
  }
  return {
    kind: "group",
    groupType: "()",
    nodes, // TODO combine adjacent text nodes
    singleLine: declaration.singleLine,
  };
}

function unparseGroup(
  groupType: TextGroupType,
  expressions: readonly DustExpression.Any[],
  singleLine: boolean,
): TextNode {
  const nodes = expressions.map(unparseExpression);
  // TODO!! need to join adjacent leaves by whitespace?
  return {
    kind: "group",
    groupType,
    nodes,
    singleLine,
  };
}
