import { For, JSX, Match, Switch, createMemo } from "solid-js";
import { TextNodeEditorProps } from "./TextViewTypes";
import {
  TextGroup,
  TextNode,
  asLeaf,
  isLeaf,
  isNotBlank,
} from "../text/TextTree";
import { TextNodeEditor } from "./TextNodeEditor";
import { isOdd } from "../math/Numbers";

// (if a then b)
// (if a then b else c)
// ( if a then b
//   if c then d )
// ( if a then b
//   if c then d
//        else e )
// ( if a then b
//   if c then d
//   if e then f )
// ( if a then b
//   if c then d
//   if e then f
//        else g )
// ...
export function IfThenMacro(props: TextNodeEditorProps<TextGroup>) {
  const nonBlankNodes = createMemo(() => props.node.nodes.filter(isNotBlank));

  function renderChildNode(node: TextNode): JSX.Element {
    return (
      <TextNodeEditor
        {...props}
        jsonPointer={
          props.jsonPointer + "/nodes/" + props.node.nodes.indexOf(node)
        }
        node={node}
        depthLimit={props.depthLimit - 1}
      />
    );
  }

  function f() {
    const nodes = nonBlankNodes();
    for (let i = 0; i < nodes.length; i += 4) {
      let [ifToken, condition, thenToken, result] = nodes.slice(i, i + 4);
    }
  }

  function isIfOrElseToken(node: TextNode): boolean {
    return isLeaf(node) && (node.text === "if" || node.text === "else");
  }

  // TODO handle edits to these keywords somehow: either prevent them and show the user a cue if they try, or make it impossible for the cursor to go into the keywords. That way the user could select the whole expression and delete it, but not any of the individual keywords. Or they could select a branch and delete just that branch
  return (
    <div>
      <For each={nonBlankNodes()}>
        {(node, index) => (
          <Switch>
            {/* "if" or "else" */}
            <Match when={index() === 0 && asLeaf(node)?.text !== "if"}>
              <span>Error: first token must be the word "if"</span>
            </Match>
            <Match
              when={index() > 0 && index() % 4 === 0 && !isIfOrElseToken(node)}
            >
              <span>
                Error: token #{index() + 1} must be the word "if" or "else"
              </span>
            </Match>
            <Match when={index() % 4 === 0 && isIfOrElseToken(node)}>
              {asLeaf(node)!.text}
            </Match>

            {/* "then" */}
            <Match
              when={index() % 4 === 2 && isLeaf(node) && node.text === "then"}
            >
              then
            </Match>
            <Match
              when={
                index() % 4 === 2 && !(isLeaf(node) && node.text === "then")
              }
            >
              <span>Error: token #{index() + 1} must be the word "then"</span>
            </Match>

            {/* The conditions and results */}
            <Match when={isOdd(index() % 4)}>{renderChildNode(node)}</Match>
          </Switch>
        )}
      </For>

      {/* <Show
        when={asLeaf(nonBlankNodes()[0])?.text === "if"}
        fallback={'Error: first token must be the word "if"'}
      >
        if
        <Show
          when={nonBlankNodes()[1]}
          fallback={"Error: missing condition expression"}
        >
          {renderChildNode}
        </Show>
      </Show>
      <Show
        when={asLeaf(nonBlankNodes()[2])?.text === "then"}
        fallback={'Error: third token must be the word "then"'}
      >
        then
        <Show
          when={nonBlankNodes()[3]}
          fallback={"Error: missing result expression"}
        >
          {renderChildNode}
        </Show>
      </Show> */}

      {/* TODO handle errors */}
      <Switch>
        <Match when={nonBlankNodes().length % 4 === 0}>
          {/* No else branch */}
          TODO: render the remaining "then" branches
        </Match>
        <Match when={nonBlankNodes().length % 4 === 2}>
          TODO: render the remaining "then" branches and the "else" branch
        </Match>
      </Switch>
    </div>
  );
}
