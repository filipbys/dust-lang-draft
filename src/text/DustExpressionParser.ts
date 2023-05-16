import type { DustExpression, DustLeafExpression } from "./DustExpression";
import { isOdd } from "../math/Numbers";
import {
  GenericTextGroup,
  TextGroup,
  TextLeaf,
  TextNode,
  isBlank,
  toUTF8,
} from "./TextTree";

export type ParsedTextNode = ParsedTextLeaf | ParsedTextGroup;

// TODO DustLeafExpression is wrong: DustTextExpression is a TextGroup with a single sub-expression.
export type ParsedTextLeaf = TextLeaf &
  Readonly<{ expression: DustLeafExpression }>;

export type ParsedTextGroup = Readonly<
  GenericTextGroup<readonly ParsedTextNode[]>
> &
  Readonly<{ expression: DustExpression }>;

// TODO return a ParsedTextNode that implements the DustExpression interface lazily instead
export function parseExpression(node: TextNode): DustExpression {
  if (node.textTreeKind === "leaf") {
    return Leaves.parseLeaf(node.text);
  } else {
    return Groups.parseGroup(node);
  }
}

namespace Leaves {
  export function parseLeaf(text: string): DustExpression {
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
  function splitByPunctuation(text: string): DustExpression {
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

// function splitByWhitespace(text: string): string[] | undefined {
//   const items = text.split(/\s+/);
//   if (items.length <= 1) {
//     return undefined;
//   }
//   return items;
// }

// NB: not all of these are actually used, but they're all reserved
// TODO convert to a type-info object like GROUP_TYPE_INFO
export const BINARY_OPERATORS: readonly string[] = [
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

namespace Groups {
  export function parseGroup(group: TextGroup): DustExpression {
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

  function parseTextGroup(group: TextGroup): DustExpression {
    const text = toUTF8(group);
    // TODO preserve the text tree: there may be interpolated sections within it
    // In fact maybe we should look for those sections here.
    return {
      kind: "text",
      text,
      singleLine: !text.includes("\n"),
    };
  }

  function parseParenthesizedGroup(group: TextGroup): DustExpression {
    // TODO need to parse Declarations differently

    const expressions: DustExpression[] = []; // TODO make this a live ReadonlyArray<DustExpression>
    let functionCallKind: "prefix" | "binary" = "prefix";

    group.nodes.forEach((node) => {
      if (isBlank(node)) {
        return;
      }
      if (
        isOdd(expressions.length) &&
        node.textTreeKind === "leaf" &&
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
            expressions: expressions.slice(1), // TODO use a live ReadonlyArray<DustExpression> slice
            singleLine: group.singleLine,
          };
        }
        if (first.identifier === "if") {
          return {
            kind: "ifThen",
            expressions, // TODO use a live ReadonlyArray<DustExpression> slice
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

  function parseList(
    kind: "block" | "array",
    group: TextGroup,
  ): DustExpression {
    return {
      kind,
      expressions: group.nodes
        .filter((node) => !isBlank(node))
        .map(parseExpression),
      singleLine: group.singleLine,
    };
  }
}
