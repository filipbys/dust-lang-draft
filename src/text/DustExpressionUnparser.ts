import type { TextNode, TextGroupType } from "./TextTree";
import type * as DustExpression from "../types/DustExpression";

export function unparseExpression(expression: DustExpression.Any): TextNode {
  const kind = expression.kind;
  if (kind === "identifier") {
    return { kind: "leaf", text: expression.identifier };
  } else if (kind === "declaration") {
    return unparseDeclaration(expression);
  } else if (kind === "functionCall") {
    return unparseGroup("()", expression.expressions);
  } else if (kind === "array") {
    return unparseGroup("[]", expression.expressions);
  } else if (kind === "block") {
    return unparseGroup("{}", expression.expressions);
  }
  throw `Unrecognized expression kind ${kind}`;
}

const COLON: TextNode = { kind: "leaf", text: ":" };
const EQUALS: TextNode = { kind: "leaf", text: "=" };

function getLength(node: TextNode): number {
  if (node.kind === "leaf") {
    return node.text.length;
  }
  return node.totalLength;
}

function calculateTotalLength(nodes: readonly TextNode[]): number {
  return nodes.map(getLength).reduce((a, b) => a + b);
}

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
    nodes,
    totalLength: calculateTotalLength(nodes),
  };
}

function unparseGroup(
  groupType: TextGroupType,
  expressions: readonly DustExpression.Any[]
): TextNode {
  const nodes = expressions.map(unparseExpression);
  // TODO!! need to join adjacent leaves by whitespace?
  return {
    kind: "group",
    groupType,
    nodes,
    totalLength: calculateTotalLength(nodes),
  };
}
