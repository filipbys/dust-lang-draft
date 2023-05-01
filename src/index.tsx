/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";
import App from "./App";

import { HTMLPhysicsSimulationElement } from "./simulations/HTMLPhysicsSimulationElement";

class DustLangEditor extends HTMLElement {
  constructor() {
    super();
    console.log("DustLangEditor hello!");
  }

  connectedCallback() {
    render(() => <App />, this);
  }
}

// TODO find a better place for all this
customElements.define(
  HTMLPhysicsSimulationElement.TAG,
  HTMLPhysicsSimulationElement,
);
customElements.define("dust-lang-editor", DustLangEditor);
