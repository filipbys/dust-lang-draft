// TODO convert to JSON-schema or protobuf or some other cross-language format
export type Any = Readonly<Destructurable | IfThen | Declaration | Block>;

export type Destructurable = Readonly<
  | Identifier
  | { kind: "text"; text: string; totalLength: number }
  | { kind: "interpolatedText"; chunks: readonly Any[]; totalLength: number }
  | FunctionCall
  | Array
  | Module
>;

export type Array = Readonly<{
  kind: "array";
  expressions: readonly Any[];
  totalLength: number;
}>;

export type Module = Readonly<{
  kind: "module";
  name: Any;
  publicElements: readonly Any[];
  privateElements: readonly Any[];
  totalLength: number;
}>;

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

export type Block = Readonly<{
  kind: "block";
  expressions: readonly Any[];
  totalLength: number;
}>;

export type Identifier = {
  kind: "identifier";
  identifier: string;
  totalLength: number;
};

export type FunctionCall = Readonly<{
  kind: "functionCall";
  functionKind: "prefix" | "binary" | "punctuation"; // TODO handle punctuation
  expressions: readonly Any[];
  totalLength: number;
}>;

export type IfThen = Readonly<{
  kind: "ifThen";
  cases: readonly IfThenBranch[];
  elseBranch?: Any;
  totalLength: number;
}>;

export type IfThenBranch = Readonly<{
  condition: Any;
  result: Any;
}>;

export type Declaration = Readonly<{
  kind: "declaration";
  pattern: Destructurable; // e.g. foo or (foo bar baz) or [a, b, c]
  constraints?: Any; // : (constraints expression)
  value?: Any; // = (value expression)
  totalLength: number;
}>;
