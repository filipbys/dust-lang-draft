/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";
import App from "./App";

class DustLangEditor extends HTMLElement {
  constructor() {
    super();
    console.log("DustLangEditor hello!");
  }

  connectedCallback() {
    render(() => <App />, this);
  }
}

customElements.define("dust-lang-editor", DustLangEditor);
