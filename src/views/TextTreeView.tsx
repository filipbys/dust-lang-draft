import { Component, For, Match, Switch } from "solid-js";

// import {
//   TextGroup,
//   TextNode,
//   asGroup,
//   asLeaf,
//   groupEnd,
//   groupStart,
// } from "../text/TextTree";

// // TODO make this take a DustExpression instead and do the work of maintaining the mapping here.
// export const TextTreeView: Component<{ id: string; node: TextNode }> = (
//   props,
// ) => {
//   return (
//     <Switch>
//       <Match when={asLeaf(props.node)}>
//         {(leaf) => (
//           <span
//             classList={{
//               Dust: true,
//               textLeaf: true,
//               blank: leaf().isBlank,
//             }}
//           >
//             {/* TODO double-click should select whole tokens even if they're dashed (e.g. foo-bar) */}
//             {leaf().text}
//           </span>
//         )}
//       </Match>
//       <Match when={asGroup(props.node)}>
//         {(group) => <TextGroupView group={group()} />}
//       </Match>
//     </Switch>
//   );
// };

// const TextGroupView: Component<{ id: string; group: TextGroup }> = (props) => {
//   return (
//     <div
//       class="Dust textGroup"
//       data-group-type={props.group.groupType}
//     >
//       {groupStart(props.group.groupType)}
//       <For each={props.group.nodes}>
//         {(node, index) => (
//           <TextTreeView node={node} />
//         )}
//       </For>
//       {groupEnd(props.group.groupType)}
//     </div>
//   );
// };
