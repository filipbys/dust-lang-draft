import type { Node, Group } from "./TextTree";
import { toUTF8 } from "./TextTree";
import type { Any } from "../types/DustExpression";

export function parseExpression(textTree: Node): Any {
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
    const totalLength = text.length;
    const parts = [];
    let start = 0;
    let end = 0;
    for (; end < totalLength; end++) {
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
      return { kind: "identifier", identifier: text, totalLength };
    }
    if (start < end) {
      parts.push(text.substring(start, end));
    }
    throw "not yet implemented"; // TODO
    // const expressions = parts.map(parse)
    // return { kind: 'functionCall', functionKind: 'punctuation', expressions, totalLength }
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
  export function parseGroup(group: Group): Any {
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

  function parseTextGroup(group: Group): Any {
    const text = toUTF8(group);
    // TODO preserve ascii vs UTF-8
    // TODO interpolated text
    return { kind: "text", text, totalLength: text.length };
  }

  function splitIfIsLeafAndContainsWhitespace(
    node: Node
  ): readonly Node[] | undefined {
    if (node.kind !== "leaf") {
      return undefined;
    }
    return splitByWhitespace(node.text)
      ?.filter((text) => text.length > 0)
      .map((text) => ({ kind: "leaf", text }));
  }

  // TODO may need to retain whether or not any leaves had a line break for ".vertical" styling?
  function splitLeavesAtWhitespace(nodes: readonly Node[]): readonly Node[] {
    const newNodes: Node[] = [];
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

  function parseParenthesizedGroup(group: Group): Any {
    // TODO need to parse Declarations differently

    const expressions: Any[] = [];
    let functionCallKind: "prefix" | "binary" = "prefix";

    splitLeavesAtWhitespace(group.nodes).forEach((node, index) => {
      if (
        index > 0 &&
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

    // TODO if kind === 'binary', ensure that every odd element is a binary operator
    // (if binary operators are being passed as function parameters they must be wrapped in parentheses e.g. (+))
    // Also ensure that all binary operators being called are compatible with each other without precedence rules (e.g. * /, + - are ok together, but * + or / - or any other combo is not allowed: you must explicitly group)
    return {
      kind: "functionCall",
      functionKind: functionCallKind,
      expressions,
      totalLength: group.totalLength,
    };
  }

  function parseList(kind: "block" | "array", group: Group): Any {
    const expressions = splitLeavesAtWhitespace(group.nodes).map(
      parseExpression
    );
    return { kind, expressions, totalLength: group.totalLength };
  }
}
