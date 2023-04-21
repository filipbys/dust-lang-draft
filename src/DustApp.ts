import { toTextTree, toUTF8 } from "./TextTree";
import type { Any } from "./DustExpression";
import { parseExpression } from "./DustExpressionParser";
import { unparseExpression } from "./DustExpressionUnparser";
import { createWindow } from "./Windows";
import * as DustHTMLWindow from "./DustHTMLWindow";
import { createModule } from "./Modules";

function initializePlainTextEditor() {
  const app = document.querySelector("#editor-container")!;
  const inputBox = app.querySelector("#debug-input-box")!;
  inputBox.addEventListener("input", onInput, false);

  const saveButton = app.querySelector("#debug-save-button")!;
  saveButton.addEventListener("click", () => {
    // TODO expression is immutable: need to unparse the HTML itself back to an expression first
    const textTree = unparseExpression(expression);
    console.log(`unparsed text tree: ${JSON.stringify(textTree)}`);
    inputBox.textContent = toUTF8(textTree);
  });

  let expression: Any;
  let output = app.querySelector("#debug-output")!;

  onInput();

  function onInput() {
    const text: string = inputBox.textContent || "";
    console.log(text);

    const textParseResult = toTextTree(text);

    if (textParseResult.kind != "success") {
      console.warn(`Parse error: ${JSON.stringify(textParseResult)}`);
      return;
    }
    console.log(
      `total length of text node: ${textParseResult.node.totalLength}`
    );
    console.log(JSON.stringify(textParseResult.node));

    expression = parseExpression(textParseResult.node);
    console.log(`total length of expression: ${expression.totalLength}`);

    console.log(JSON.stringify(expression));

    app.removeChild(output);
    output = DustHTMLWindow.createWindow(expression, 20);
    app.appendChild(output);
  }
}

// TODO consider solidjs: https://dev.to/this-is-learning/making-the-case-for-signals-in-javascript-4c7i
function testOutSomeWindows() {
  function html(html: string): HTMLElement {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    return wrapper.children.item(0) as HTMLElement;
  }

  const window1 = createWindow([
    html(`
            <div class="Dust vertical prefix functionCall ifExpression4Columns">
                <span class="Dust identifier function">if</span>
                <span class="Dust identifier">A</span>
                <span class="Dust identifier function">then</span>
                <span class="Dust identifier">B</span>

                <span class="Dust identifier function">if</span>
                <span class="Dust identifier">C</span>
                <span class="Dust identifier function">then</span>
                <span class="Dust identifier">D</span>

                <span class="Dust identifier function" style="grid-column-end: 4;">else</span>
                <span class="Dust identifier">E</span>
            </div>
        `),
    createModule([]).htmlElement,
  ]);

  document.querySelector("#example-dust-windows")!.append(window1.htmlElement);
}

function letsTryIt() {
  testOutSomeWindows();
  // initializePlainTextEditor()
}

window.addEventListener("DOMContentLoaded", letsTryIt, false);
