import type { Component } from "solid-js";
import type { TextGroup, TextNode } from "../text/TextTree";

export interface Identifiers {
  jsonPointer: string;
  editorID: string;
}

export interface TextNodeProps<N extends TextNode> extends Identifiers {
  node: N;
  binaryOperators?: Set<string>;
  depthLimit: number;
  isSelected: (id: string) => boolean;
}

export interface TextNodeEditorProps<N extends TextNode>
  extends TextNodeProps<N> {
  displayType: TextNodeEditorDisplayType;
  setSimulationPlaying(playing: boolean): void;
  macros?: Map<string, TextGroupMacro>;
}

export type TextGroupMacro = Component<TextNodeEditorProps<TextGroup>>;

export type TextNodeEditorDisplayType = "plainText" | "parsedText" | "both";
