// TODO JS string encoding is WEIRD. See https://www.infoq.com/presentations/js-character-encoding/
// Current index-and-.length-based approach is definitely broken for some kinds of inputs
// We should implement text parsing functions in Rust, and then convert to JS strings only when we need to put them in the DOM
// Alternatively, use ByteArrays and plain ascii as the parsing layer, then have a JS-string layer for the user-facing text, then convert JS-string inputs to ascii for parsing, replacing a known subset of unicode characters with their \keyword counterparts
export const MAX_HORIZONTAL_LENGTH = 80; // TODO make this an adjustable setting

export const GROUP_TYPE_INFO = {
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

function groupStart(groupType: GroupType): string {
  return groupType[0];
}

function groupEnd(groupType: GroupType): string {
  return groupType[groupType.length - 1];
}

export const [GROUP_TYPES_BY_START, GROUP_TYPES_BY_END]: [
  Map<string, GroupType>,
  Map<string, GroupType>
] = (() => {
  let starts = new Map<string, GroupType>();
  let ends = new Map<string, GroupType>();
  for (const key in GROUP_TYPE_INFO) {
    const groupType = key as GroupType;
    starts.set(groupStart(groupType), groupType);
    ends.set(groupEnd(groupType), groupType);
  }
  return [starts, ends];
})();

export type GroupType = keyof typeof GROUP_TYPE_INFO;

type _Group<Nodes> = {
  readonly kind: "group";
  readonly groupType: GroupType;
  readonly nodes: Nodes;
  totalLength: number;
};
export type Group = Readonly<_Group<readonly Node[]>>;
type MutableGroup = _Group<Node[]>;

export type Leaf = Readonly<{ kind: "leaf"; text: string }>;

export type Node = Group | Leaf;

export type ParseError = Readonly<
  | {
      kind: "error:missing-start-of-group";
      groupType: GroupType;
      partialNode: Node;
      index: number;
    }
  | {
      kind: "error:missing-one-or-more-ends-of-groups";
      unfinishedGroups: readonly Group[]; // .at(0) is the root and .at(-1) is the most recently opened group that needs closing
    }
>;

export type ParseResult =
  | Readonly<{ kind: "success"; node: Group }>
  | ParseError;

export function toTextTree(text: string): ParseResult {
  let stack: MutableGroup[] = [];
  let currentGroup: MutableGroup = {
    kind: "group",
    groupType: "()",
    nodes: [],
    totalLength: 0,
  };

  function startNewGroup(groupType: GroupType) {
    endCurrentTextChunk();
    stack.push(currentGroup);
    currentGroup = { kind: "group", groupType, nodes: [], totalLength: 1 };
  }

  function endCurrentGroup(): Group {
    endCurrentTextChunk();
    currentGroup.totalLength += 1;
    return currentGroup;
  }

  let currentIndex = 0;
  let currentTextChunkStartIndex = 0;
  function endCurrentTextChunk() {
    if (currentTextChunkStartIndex < currentIndex) {
      const textChunk = text.slice(currentTextChunkStartIndex, currentIndex);
      currentGroup.nodes.push({ kind: "leaf", text: textChunk });
      currentGroup.totalLength += textChunk.length;
    }
    currentTextChunkStartIndex = currentIndex + 1;
  }

  for (; currentIndex < text.length; currentIndex++) {
    const c = text[currentIndex];
    const groupTypeStart: GroupType | undefined = GROUP_TYPES_BY_START.get(c);
    const groupTypeEnd: GroupType | undefined = GROUP_TYPES_BY_END.get(c);

    const isStart = groupTypeStart !== undefined;
    const isEnd = groupTypeEnd !== undefined;

    // NB: text-type groups may have the same character for start and end
    if (isStart && (!isEnd || currentGroup.groupType !== groupTypeStart)) {
      startNewGroup(groupTypeStart);
    } else if (isEnd) {
      const group = endCurrentGroup();
      const parentGroup: MutableGroup | undefined = stack.pop();
      if (parentGroup === undefined) {
        return {
          kind: "error:missing-start-of-group",
          groupType: groupTypeEnd,
          partialNode: group,
          index: currentIndex,
        };
      }
      parentGroup.nodes.push(group);
      parentGroup.totalLength += group.totalLength;
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

function isSingleLine(group: Group): boolean {
  return group.totalLength < MAX_HORIZONTAL_LENGTH;
}

const SINGLE_INDENT = "  ";

function multilineGroupToUTF8(group: Group, indent: string) {
  const groupType = group.groupType;
  const start = indent + groupStart(groupType);
  const nextIndent = indent + SINGLE_INDENT;
  // TODO unroll recursion to avoid S/O
  const nodes = group.nodes.map((node) => toUTF8(node, nextIndent));
  const end = indent + groupEnd(groupType);
  return start + "\n" + nodes.join("\n") + "\n" + end;
}

// TODO actually JS strings are UTF-16. Rename to toJsString
export function toUTF8(node: Node, indent: string = ""): string {
  if (node.kind === "leaf") {
    return indent + node.text;
  }
  const group = node;
  if (isSingleLine(group)) {
    const groupType = group.groupType;
    const nodes = group.nodes.map((node) => toUTF8(node)).join(" ");
    // TODO unroll recursion to avoid S/O
    return indent + groupStart(groupType) + nodes + groupEnd(groupType);
  }
  return multilineGroupToUTF8(group, indent);
}
