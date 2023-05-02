import type { TextNode, TextGroup } from "./TextTree";
import { toUTF8 } from "./TextTree";
import type { Any, IfThenBranch } from "../types/DustExpression";
import { isOdd } from "../math/Numbers";
import { assert } from "../development/Errors";

export function parseExpression(textTree: TextNode): Any {
  if (textTree.kind === "leaf") {
    return Leaves.parseLeaf(textTree.text);
  } else {
    return Groups.parseGroup(textTree);
  }
}

namespace Leaves {
  export function parseLeaf(text: string): Any {
    if (splitByWhitespace(text) !== undefined) {
      throw "Error: leaf cannot contain whitespace"; // TODO
    }
    return splitByPunctuation(text);
  }

  // TODO need to handle punctuation in groups too, not just leaves
  const PUNCTUATION = {
    ",": { description: "comma operator" },
    ":": { description: "colon operator" },
    ";": { description: "semi-colon operator" },
    ".": { description: "dot/scope operator" },
    "?": { description: "question-mark operator" },
    "!": { description: "exclamation point operator" },
  } as const;

  // TODO this belongs in DustTextTree... Need its parse function
  function splitByPunctuation(text: string): Any {
    const parts = [];
    let start = 0;
    let end = 0;
    for (; end < text.length; end++) {
      const c = text[end];
      if (c in PUNCTUATION) {
        if (start < end) {
          // TODO what if start = (end - 1) and the string is empty?
          parts.push(text.substring(start, end));
        }
        parts.push(c);
        start = end + 1;
      }
    }
    if (start === 0) {
      return {
        kind: "identifier",
        identifier: text,
        singleLine: true,
      };
    }
    if (start < end) {
      parts.push(text.substring(start, end));
    }
    throw "not yet implemented"; // TODO
    // const expressions = parts.map(parse)
    // return { kind: 'functionCall', functionKind: 'punctuation', expressions }
  }
}

function splitByWhitespace(text: string): string[] | undefined {
  const items = text.split(/\s+/);
  if (items.length <= 1) {
    return undefined;
  }
  return items;
}

namespace Groups {
  export function parseGroup(group: TextGroup): Any {
    const groupType = group.groupType;
    // TODO for all of these, need to parse (a.bar b.foo) and possibly (a="bar" b=(2 + 42 - 2))?
    // But should this be here or at the TextTree level?
    if (groupType === '""') {
      return parseTextGroup(group);
    }
    if (groupType === "()") {
      return parseParenthesizedGroup(group);
    }
    if (groupType === "[]") {
      return parseList("array", group);
    }
    if (groupType === "{}") {
      return parseList("block", group);
    }
    // TODO return an Error object instead containing the valid part of the Expression
    throw `Unrecognized groupType ${groupType}`;
  }

  function parseTextGroup(group: TextGroup): Any {
    const text = toUTF8(group);
    // TODO preserve the text tree: there may be interpolated sections within it
    // In fact maybe we should look for those sections here.
    return {
      kind: "text",
      text,
      singleLine: !text.includes("\n"),
    };
  }

  function splitIfIsLeafAndContainsWhitespace(
    node: TextNode,
  ): readonly TextNode[] | undefined {
    if (node.kind !== "leaf") {
      return undefined;
    }
    return splitByWhitespace(node.text)
      ?.filter((text) => text.length > 0)
      .map((text) => ({ kind: "leaf", text }));
  }

  function splitLeavesAtWhitespace(
    nodes: readonly TextNode[],
  ): readonly TextNode[] {
    const newNodes: TextNode[] = [];
    nodes.forEach((node) => {
      const items = splitIfIsLeafAndContainsWhitespace(node);
      if (items !== undefined) {
        newNodes.push(...items);
      } else {
        newNodes.push(node);
      }
    });
    return newNodes;
  }

  // NB: not all of these are actually used, but they're all reserved
  // TODO convert to a type-info object like GROUP_TYPE_INFO
  const BINARY_OPERATORS: readonly string[] = [
    // Arithmetic
    "+",
    "-",
    "±",
    "*",
    "×",
    "**",
    "/",
    "÷",
    "//",
    "%",
    "^",

    // Comparison
    "<",
    ">",
    "≤",
    "≥",
    "=",
    "≠",
    "≡",
    "≢",

    // Binary Logic
    "and",
    "or",
    "xor",
    "is",
    "in", // No 'contains': just use container.contains

    // Sets
    "∪",
    "∩",
    "⊂",
    "⊃",
    "⊆",
    "⊇", // TODO there's more

    // Concat?
    "++",

    // Ranges
    "to",
    "up-to", // E.g. (1 to 4) or (0 up-to array.length)

    // TODO!!!!!!!!
    // the above must be separated from identifiers by whitespace, e.g. (a + b - c),
    // whereas the below do not, e.g. (a.b?c!d)
    // TODO!!!!!!!!

    // Value declarations
    ":", // TODO need to disambiguate '=' as a boolean operator vs as a declaration operator

    // Punctuation
    ".",
    "?",
    "!",
    ",",
    "",
  ];

  function parseParenthesizedGroup(group: TextGroup): Any {
    // TODO need to parse Declarations differently

    const expressions: Any[] = [];
    let functionCallKind: "prefix" | "binary" = "prefix";

    splitLeavesAtWhitespace(group.nodes).forEach((node, index) => {
      if (
        isOdd(index) &&
        node.kind === "leaf" &&
        BINARY_OPERATORS.includes(node.text)
      ) {
        functionCallKind = "binary";
      }
      expressions.push(parseExpression(node));
    });

    if (expressions.length === 1) {
      return expressions[0]; // TODO explain
    }

    if (expressions.length > 1) {
      const first = expressions[0];

      // TODO return error objects instead of asserting and throwing
      if (functionCallKind === "prefix" && first.kind === "identifier") {
        if (first.identifier === "module") {
          if (expressions.length !== 4) {
            throw `Module must have three parameters, got ${
              expressions.length - 1
            }`;
          }
          const publicElements = expressions[2];
          const privateElements = expressions[3];

          if (
            publicElements.kind !== "array" ||
            privateElements.kind !== "array"
          ) {
            throw `Last 2 parameters to module must be arrays, got ${publicElements.kind}, ${privateElements.kind}`;
          }

          return {
            kind: "module",
            name: expressions[1],
            publicElements: publicElements.expressions,
            privateElements: privateElements.expressions,
            singleLine: group.singleLine,
          };
        }
        function isIdentifierEqualTo(expression: Any, identifier: string) {
          return (
            expression.kind === "identifier" &&
            expression.identifier === identifier
          );
        }
        if (first.identifier === "if") {
          // e.g.:
          // (if <expr> then <expr>)
          // (if <expr> then <expr> else <expr>)
          // (
          //   if <expr> then <expr>
          //   if <expr> then <expr>
          //             else <expr>
          // )
          if (expressions.length < 4 || isOdd(expressions.length)) {
            throw `If expression must have an even number of terms and at least 4 terms, got ${expressions.length}`;
          }
          let cases: IfThenBranch[] = [];
          for (let index = 0; index < expressions.length; index += 4) {
            const ifToken = expressions[index];
            const condition = expressions[index + 1];
            const thenToken = expressions[index + 2];
            const result = expressions[index + 3];

            assert(
              isIdentifierEqualTo(ifToken, "if"),
              "Expected 'if', got",
              ifToken,
            );
            assert(
              isIdentifierEqualTo(thenToken, "then"),
              "Expected 'then', got",
              thenToken,
            );

            cases.push({ condition, result });
          }

          const nextToLast = expressions.at(-2)!;
          const elseBranch = isIdentifierEqualTo(nextToLast, "name")
            ? expressions.at(-1)!
            : undefined;

          return {
            kind: "ifThen",
            cases,
            elseBranch,
            singleLine: group.singleLine,
          };
        }
        if (first.identifier === "case") {
          // TODO parse case expression
        }
      }
    }

    // TODO if kind === 'binary', ensure that every odd element is a binary operator
    // (if binary operators are being passed as function parameters they must be wrapped in parentheses e.g. (+))
    // Also ensure that all binary operators being called are compatible with each other without precedence rules (e.g. * /, + - are ok together, but * + or / - or any other combo is not allowed: you must explicitly group)
    return {
      kind: "functionCall",
      functionKind: functionCallKind,
      expressions,
      singleLine: group.singleLine,
    };
  }

  function parseList(kind: "block" | "array", group: TextGroup): Any {
    const expressions = splitLeavesAtWhitespace(group.nodes).map(
      parseExpression,
    );
    return {
      kind,
      expressions,
      singleLine: group.singleLine,
    };
  }
}
