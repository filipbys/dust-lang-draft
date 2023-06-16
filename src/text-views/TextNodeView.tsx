import { For, Match, Switch, mergeProps, onMount } from "solid-js";
import {
  TextGroup,
  TextLeaf,
  TextNode,
  groupEnd,
  groupStart,
  isBlank,
  isGroup,
  isLeaf,
} from "../text/TextTree";
import { TextNodeProps } from "./TextViewTypes";

import "./TextNodeView.css";
import { getID } from "./Identifiers";
import { makeDraggableAndZoomable } from "../drag-zoom-drop/DragZoomAndDropV2";
import { setCssCenter } from "../html-custom-elements/CSSHelpers";
import { Vector2D } from "../math/Vectors";

export function TextNodeView(props: TextNodeProps<TextNode>) {
  return (
    <Switch>
      <Match when={isLeaf(props.node)}>
        <TextLeafView {...(props as TextNodeProps<TextLeaf>)} />
      </Match>
      <Match when={props.depthLimit > 0 && isGroup(props.node)}>
        <TextGroupView {...(props as TextNodeProps<TextGroup>)} />
      </Match>
      <Match when={props.depthLimit === 0}>
        ...
        {/* TODO teach user how to zoom in */}
      </Match>
    </Switch>
  );
}

export function TextGroupView(props: TextNodeProps<TextGroup>) {
  return (
    <div
      id={getID(TextGroupView, props)}
      data-group-type={props.node.groupType}
      classList={mergeProps(props.classList, {
        Dust: true,
        textNode: true,
        textGroup: true,
        isSelected: props.isSelected(props.jsonPointer),
      })}
    >
      {groupStart(props.node.groupType)}
      <For each={props.node.nodes}>
        {(node, index) => (
          <TextNodeView
            {...props}
            jsonPointer={props.jsonPointer + "/nodes/" + index()}
            node={node}
            depthLimit={props.depthLimit - 1}
          />
        )}
      </For>
      {groupEnd(props.node.groupType)}
    </div>
  );
}

export function TextLeafView(props: TextNodeProps<TextLeaf>) {
  let spanRef: HTMLSpanElement;
  onMount(() => {
    let localScale = 1.0;
    let center: Readonly<Vector2D> = [0, 0];
    // TODO should only be draggable if the node itself is selected (not its text)
    // makeDraggableAndZoomable(spanRef, {
    //   properties: {
    //     get center() {
    //       return center;
    //     },
    //     set center(value) {
    //       setCssCenter(spanRef, value);
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
    //       spanRef.style.fontSize = `${value * 100}%`;
    //       localScale = value;
    //     },
    //   },
    // });
  });
  return (
    <span
      ref={spanRef!}
      id={getID(TextLeafView, props)}
      classList={mergeProps(props.classList, {
        Dust: true,
        textNode: true,
        textLeaf: true,
        identifier: !isBlank(props.node),
        binaryOperator: props.binaryOperators?.has(props.node.text),
        isSelected: props.isSelected(props.jsonPointer),
      })}
      tabIndex={isBlank(props.node) ? -1 : 0}
    >
      {/* TODO double-click should select whole tokens even if they're dashed (e.g. foo-bar) */}
      {props.node.text}
    </span>
  );
}
