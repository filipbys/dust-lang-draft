// TODO convert to JSON-schema or protobuf or some other cross-language format
export type Any = Readonly<Destructurable | IfThen | Declaration | Block>;

export type Destructurable = Readonly<
  | Identifier
  | { kind: "text"; text: string; totalLength: number }
  | { kind: "interpolatedText"; chunks: readonly Any[]; totalLength: number }
  | FunctionCall
  | Array
>;

export type Array = Readonly<{
  kind: "array";
  expressions: readonly Any[];
  totalLength: number;
}>;

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
