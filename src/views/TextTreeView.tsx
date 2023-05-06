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
// TODO make this take a DustExpression instead and do the work of maintaining the mapping here.
export const TextTreeView: Component<{ id: string; node: TextNode }> = (
  props,
) => {
  return (
    <Switch>
      <Match when={props.node.kind === "leaf"}>
        <span class="Dust textLeaf" id={props.id}>
          {/* TODO double-click should select whole tokens even if they're dashed (e.g. foo-bar) */}
          {(props.node as TextLeaf).text}
        </span>
      </Match>
      <Match when={props.node.kind === "group"}>
        <TextGroupView id={props.id} group={props.node as TextGroup} />
      </Match>
    </Switch>
  );
};

const TextGroupView: Component<{ id: string; group: TextGroup }> = (props) => {
  return (
    <div
      class="Dust textGroup"
      id="props.id"
      data-group-type={props.group.groupType}
    >
      {groupStart(props.group.groupType)}
      <For each={props.group.nodes}>
        {(node, index) => (
          <TextTreeView id={props.id + "/nodes/" + index()} node={node} />
        )}
      </For>
      {groupEnd(props.group.groupType)}
    </div>
  );
};
