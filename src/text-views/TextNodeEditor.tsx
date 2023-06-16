import {
  For,
  Match,
  Show,
  Switch,
  createSignal,
  mergeProps,
  onMount,
} from "solid-js";

import { makeDraggableAndZoomable } from "../drag-zoom-drop/DragZoomAndDropV2";
import { setCssCenter } from "../html-custom-elements/CSSHelpers";
import { Vector2D } from "../math/Vectors";
import {
  TextGroup,
  TextLeaf,
  TextNode,
  isBlank,
  isGroup,
  isLeaf,
  isNotBlank,
  toUTF8,
} from "../text/TextTree";
import { getID } from "./Identifiers";
import { TextGroupView, TextLeafView } from "./TextNodeView";
import {
  TextGroupMacro,
  TextNodeEditorDisplayType,
  TextNodeEditorProps,
} from "./TextViewTypes";

export function TextNodeEditor(props: TextNodeEditorProps<TextNode>) {
  function shouldShow(leaf: TextLeaf): boolean {
    const { displayType } = props;
    return (
      displayType === "plainText" ||
      (displayType === "parsedText" && !isBlank(leaf))
    );
  }

  return (
    <Switch>
      <Match when={isLeaf(props.node) && shouldShow(props.node)}>
        <TextLeafView {...(props as TextNodeEditorProps<TextLeaf>)} />
      </Match>
      <Match when={isGroup(props.node)}>
        <TextGroupEditor {...(props as TextNodeEditorProps<TextGroup>)} />
      </Match>
    </Switch>
  );
}

function TextGroupEditor(props: TextNodeEditorProps<TextGroup>) {
  const [displayType, setDisplayType] = createSignal<TextNodeEditorDisplayType>(
    props.displayType ?? "parsedText",
  );

  return (
    <Switch>
      <Match when={displayType() === "plainText"}>
        <TextGroupView {...props} />
      </Match>
      <Match when={displayType() === "parsedText"}>
        <ParsedTextGroupView {...props} />
      </Match>
      <Match when={displayType() === "both"}>
        <div style="display: inline-grid; grid-template-columns: auto auto;">
          {/* TODO!! hiding the plain text doesn't work if the parsedText is a physics element: it will be placed inside a redundant BubbleWrapper but it will still be "pinned" so it can't move. */}
          {/* TODO: maybe showing both views side by side in the same DOM node was a bad idea: it would be simpler to have a dedicated parsedText tree and a dedicated plainText tree, allowing the user to click on either one to jump to that point of the code in *both* views. */}
          <button onClick={() => setDisplayType("parsedText")}>Hide</button>
          <button onClick={() => setDisplayType("plainText")}>Hide</button>

          {/* TODO implement a shadow-Selection that tracks all Ranges in one view and displays shadows of the same ranges in the other view. */}
          <TextGroupEditor
            {...props}
            editorID={props.editorID + "/" + "plainText"}
            displayType="plainText"
          />
          <TextGroupEditor
            {...props}
            editorID={props.editorID + "/" + "parsedText"}
            displayType="parsedText"
          />
        </div>
      </Match>
    </Switch>
  );
}

function ParsedTextGroupView(props: TextNodeEditorProps<TextGroup>) {
  return (
    <Switch fallback={`Unrecognized group type ${props.node.groupType}`}>
      <Match when={props.node.groupType === '""'}>
        <TextExpression {...props} />
      </Match>
      <Match when={props.node.groupType === "()"}>
        <ParenthesizedExpression {...props} />
      </Match>
      <Match when={props.node.groupType === "[]"}>
        <List {...props} kind="array" />
      </Match>
      <Match when={props.node.groupType === "{}"}>
        <List {...props} kind="block" />
      </Match>
    </Switch>
  );
}

function TextExpression(props: TextNodeEditorProps<TextGroup>) {
  return (
    <div
      id={getID(TextExpression, props)}
      classList={mergeProps(props.classList, {
        Dust: true,
        textGroup: true,
        textExpression: true,
        isSelected: props.isSelected(props.jsonPointer),
      })}
    >
      {toUTF8(props.node)}
    </div>
  );
}

function ParenthesizedExpression(props: TextNodeEditorProps<TextGroup>) {
  function asMacro(): TextGroupMacro | undefined {
    const first = props.node.nodes.find(isNotBlank);
    if (first === undefined || !isLeaf(first)) {
      return undefined;
    }
    return props.macros?.get(first.text);
  }

  function functionCallKind(): "prefix" | "binary" {
    for (const node of props.node.nodes) {
      if (
        isLeaf(node) &&
        !isBlank(node) &&
        props.binaryOperators?.has(node.text)
      ) {
        return "binary";
        // TODO validate that the rest of the expression is a valid binary operation
      }
    }
    return "prefix";
  }

  return (
    <Switch
      fallback={
        <List
          {...props}
          kind="functionCall"
          functionCallKind={functionCallKind()}
        />
      }
    >
      <Match when={asMacro()}>{(macro) => macro()(props)}</Match>
    </Switch>
  );
}

// TODO define macros for Module, If/Then, Case, etc

type ListProps = TextNodeEditorProps<TextGroup> &
  (
    | { kind: "array" | "block" }
    | { kind: "functionCall"; functionCallKind: "prefix" | "binary" }
  );

function List(props: ListProps) {
  // TODO check if {...props} would work here including onClick
  let listRef: HTMLDivElement;
  onMount(() => {
    let localScale = 1.0;
    let center: Readonly<Vector2D> = [0, 0];
    // TODO should only be draggable if the node itself is selected (not its text).
    // So basically we want to add a click listener that selects the element and only then makes it draggable.
    // That way, once you start dragging a div, pointer events from other pointers will pass through its children (since they're not selected) and zooming will work as expected, whereas right now it's hard to two-finger zoom a div without accidentally dragging one of its children elements instead.
    // makeDraggableAndZoomable(listRef, {
    //   properties: {
    //     get center() {
    //       return center;
    //     },
    //     set center(value) {
    //       setCssCenter(listRef, value);
    //       center = value;
    //     },
    //     velocity: [0, 0],
    //     state: "pinned",
    //     get localScale() {
    //       return localScale;
    //     },
    //     set localScale(value) {
    //       if (localScale === value) {
    //         return;
    //       }
    //       listRef.style.fontSize = `${value * 100}%`;
    //       localScale = value;
    //     },
    //   },
    // });
  });
  return (
    <div
      ref={listRef!}
      id={getID(List, props)}
      classList={mergeProps(props.classList, {
        Dust: true,
        textNode: true,
        singleLine: props.node.singleLine,
        isSelected: props.isSelected(props.jsonPointer),
        [props.kind]: true,
        [props.kind === "functionCall" ? props.functionCallKind : ""]: true,
      })}
    >
      <For each={props.node.nodes}>
        {(node, index) => (
          <Show when={isNotBlank(node)} fallback={" "}>
            <TextNodeEditor
              {...props}
              jsonPointer={props.jsonPointer + "/nodes/" + index()}
              node={node}
              depthLimit={props.depthLimit - 1}
            />
          </Show>
        )}
      </For>
    </div>
  );
}
