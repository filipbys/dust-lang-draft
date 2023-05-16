export type TextNode = TextLeaf | TextGroup;

export interface TextLeaf {
  readonly textTreeKind: "leaf";
  readonly text: string;
}

export interface TextGroup
  extends Readonly<GenericTextGroup<readonly TextNode[]>> {}

export interface GenericTextGroup<TextNodes> {
  readonly textTreeKind: "group";
  readonly groupType: TextGroupType;
  readonly nodes: TextNodes;
  singleLine: boolean;
}

export function isLeaf(node: TextNode): node is TextLeaf {
  return node.textTreeKind === "leaf";
}

export function isGroup(node: TextNode): node is TextGroup {
  return node.textTreeKind === "group";
}

export function asLeaf(node: TextNode): TextLeaf | null {
  return isLeaf(node) ? node : null;
}

export function asGroup(node: TextNode): TextGroup | null {
  return isGroup(node) ? node : null;
}

export function isBlank(node: TextNode): boolean {
  return isLeaf(node) && WHITESPACE_REGEX.test(node.text);
}

export function isNotBlank(node: TextNode): boolean {
  return !isBlank(node);
}

export type TextGroupType = keyof typeof GROUP_TYPE_INFO;

// TODO JS string encoding is WEIRD. See https://www.infoq.com/presentations/js-character-encoding/
// Current index-and-.length-based approach is definitely broken for some kinds of inputs
// We should implement text parsing functions in Rust, and then convert to JS strings only when we need to put them in the DOM
// Alternatively, use ByteArrays and plain ascii as the parsing layer, then have a JS-string layer for the user-facing text, then convert JS-string inputs to ascii for parsing, replacing a known subset of unicode characters with their \keyword counterparts

const GROUP_TYPE_INFO = {
  /* TEXT-BASED GROUPS */
  "''": { description: "Character", example: "'d'" },
  '""': { description: "Ascii text", example: '"the answer is 42"' },
  "“”": { description: "UTF-8 text", example: "“the answer is “42””" },
  "«»": {
    description: "comment",
    example: "«Arbitrary text here, even «nesting» and \n line breaks»",
  },

  /* NON-TEXT-BASED GROUPS */

  // Function calls
  "()": { description: "function call", example: "(log (21 + 21))" },

  // ... but that's not consistent with itself, let alone function calls
  "[]": { description: "list", example: "[1 2 3]" },

  "{}": {
    description: "block",
    example: "{ (let a = 42) (log “the answer is $(a)”) }",
  },

  // «Function declaration, aka its signature»
  // ( (entry-to-text (key : Any) (value : Any)) : Text )

  // «Alternative way to write the signature using an Unnamed Function Type»
  // ( entry-to-text : ((Λ (key : Any) (value : Any)) : Text) )
  //
  // «Usage examples»
  // ( entry-to-text "key" "value" )
  // ( entry-to-text (key = "the answer") (value = 42) )
  //
  // «Simplest way to define the function: no type annotations»
  // ( (entry-to-text key value) = “$(key) -> $(value)” )
  // «Alternative: use an Unnamed Function»
  // ( entry-to-text = ( (λ key value) = “$(key) -> $(value)” ) )
  //
  // «Progressively adding more type annotations back in»
  // ( (entry-to-text key value) : Text = “$(key) -> $(value)” )
  // ( entry-to-text = ( (λ key value) : Text = “$(key) -> $(value)” ) )
  //
  // ( (entry-to-text (key : Any) (value : Any)) : Text = “$(key) -> $(value)” )
  // ( entry-to-text = ( (λ (key : Any) (value : Any)) : Text = “$(key) -> $(value)” ) )
} as const;

type MutableTextGroup = GenericTextGroup<TextNode[]>;

export function groupStart(groupType: TextGroupType): string {
  return groupType[0];
}

export function groupEnd(groupType: TextGroupType): string {
  return groupType[groupType.length - 1];
}

const [GROUP_TYPES_BY_START, GROUP_TYPES_BY_END]: [
  Map<string, TextGroupType>,
  Map<string, TextGroupType>,
] = (() => {
  let starts = new Map<string, TextGroupType>();
  let ends = new Map<string, TextGroupType>();
  for (const key in GROUP_TYPE_INFO) {
    const groupType = key as TextGroupType;
    starts.set(groupStart(groupType), groupType);
    ends.set(groupEnd(groupType), groupType);
  }
  return [starts, ends];
})();

export type ParseError = Readonly<
  | {
      kind: "error:missing-start-of-group";
      groupType: TextGroupType;
      partialNode: TextNode;
      index: number;
    }
  | {
      kind: "error:missing-one-or-more-ends-of-groups";
      unfinishedGroups: readonly TextGroup[]; // .at(0) is the root and .at(-1) is the most recently opened group that needs closing
    }
>;

export type ParseResult =
  | Readonly<{ kind: "success"; node: TextNode }>
  | ParseError;

const WHITESPACE_REGEX = /(\s+)/;
function addTextChunk(textChunk: string, nodes: TextNode[]) {
  for (const item of textChunk.split(WHITESPACE_REGEX)) {
    if (item.length > 0) {
      nodes.push({
        textTreeKind: "leaf",
        text: item,
      });
    }
  }
}

// TODO:
// - split leaves by whitespace, keeping separate "whitespace" tokens. That way double-clicks will always select an entire word, even if it's dash-separated.
// - parse punctuation: add a new kind of group that doesn't have a start or end but rather groups elements by connecting them with punctuation and no whitespace. Only allowed for single-line groups: it's a convenience for things like (a.foo + b.bar + c.baz). Punctuation groups are still given their own <div> with a partially-transparent background just like any other group.
export function toTextTree(text: string): ParseResult {
  let stack: MutableTextGroup[] = [];
  let currentGroup: MutableTextGroup = {
    textTreeKind: "group",
    groupType: "()",
    nodes: [],
    singleLine: true,
  };

  function startNewGroup(groupType: TextGroupType) {
    endCurrentTextChunk();
    stack.push(currentGroup);
    currentGroup = {
      textTreeKind: "group",
      groupType,
      nodes: [],
      singleLine: true,
    };
  }

  function endCurrentGroup(): TextGroup {
    endCurrentTextChunk();
    return currentGroup;
  }

  let currentIndex = 0;
  let currentTextChunkStartIndex = 0;
  function endCurrentTextChunk() {
    if (currentTextChunkStartIndex < currentIndex) {
      const textChunk = text.slice(currentTextChunkStartIndex, currentIndex);
      addTextChunk(textChunk, currentGroup.nodes);
      currentGroup.singleLine &&= !textChunk.includes("\n");
    }
    currentTextChunkStartIndex = currentIndex + 1;
  }

  for (; currentIndex < text.length; currentIndex++) {
    const c = text[currentIndex];
    const groupTypeStart: TextGroupType | undefined =
      GROUP_TYPES_BY_START.get(c);
    const groupTypeEnd: TextGroupType | undefined = GROUP_TYPES_BY_END.get(c);

    const isStart = groupTypeStart !== undefined;
    const isEnd = groupTypeEnd !== undefined;

    // NB: text-type groups may have the same character for start and end
    if (isStart && (!isEnd || currentGroup.groupType !== groupTypeStart)) {
      startNewGroup(groupTypeStart);
    } else if (isEnd) {
      const group = endCurrentGroup();
      const parentGroup: MutableTextGroup | undefined = stack.pop();
      if (parentGroup === undefined) {
        return {
          kind: "error:missing-start-of-group",
          groupType: groupTypeEnd,
          partialNode: group,
          index: currentIndex,
        };
      }
      parentGroup.nodes.push(group);
      parentGroup.singleLine &&= group.singleLine;
      currentGroup = parentGroup;
    }
  }

  const node = endCurrentGroup();

  if (stack.length > 0) {
    return {
      kind: "error:missing-one-or-more-ends-of-groups",
      unfinishedGroups: stack,
    };
  }

  return { kind: "success", node };
}

const SINGLE_INDENT = "  ";

function multilineGroupToUTF8(group: TextGroup, indent: string) {
  const groupType = group.groupType;
  const start = indent + groupStart(groupType);
  const nextIndent = indent + SINGLE_INDENT;
  // TODO unroll recursion to avoid S/O
  const nodes = group.nodes.map((node) => toUTF8(node, nextIndent));
  const end = indent + groupEnd(groupType);
  return start + "\n" + nodes.join("\n") + "\n" + end;
}

// TODO actually JS strings are UTF-16. Rename to toJsString
export function toUTF8(node: TextNode, indent: string = ""): string {
  if (node.textTreeKind === "leaf") {
    return indent + node.text;
  }
  const group = node;
  if (group.singleLine) {
    const groupType = group.groupType;
    const nodes = group.nodes.map((node) => toUTF8(node)).join(" ");
    // TODO unroll recursion to avoid S/O
    return indent + groupStart(groupType) + nodes + groupEnd(groupType);
  }
  return multilineGroupToUTF8(group, indent);
}
