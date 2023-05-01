import { Component, For, Match, Switch } from "solid-js";
import {
  groupEnd,
  groupStart,
  TextGroup,
  TextLeaf,
  TextNode,
} from "../text/TextTree";
import "./TextTreeView.css";

// TODO add a data-json-path to each element
export const TextTreeView: Component<{ node: TextNode }> = (props) => {
  return (
    <Switch>
      <Match when={props.node.kind === "leaf"}>
        <span class="Dust textLeaf">{(props.node as TextLeaf).text}</span>
      </Match>
      <Match when={props.node.kind === "group"}>
        <TextGroupView group={props.node as TextGroup} />
      </Match>
    </Switch>
  );
};

const TextGroupView: Component<{ group: TextGroup }> = (props) => {
  return (
    <div
      class="Dust textGroup"
      data-group-type={props.group.groupType}
    >
      {groupStart(props.group.groupType)}
      <For each={props.group.nodes}>
        {(node) => <TextTreeView node={node} />}
      </For>
      {groupEnd(props.group.groupType)}
    </div>
  );
};
