/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";
import App from "./App";

import type { ComponentProps } from "solid-js";
import {
  PhysicsSimulationElement,
  PhysicsSimulationElementState,
} from "./simulations/PhysicsSimulationElement";

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

customElements.define("dust-lang-editor", DustLangEditor);
customElements.define(PhysicsSimulationElement.TAG, PhysicsSimulationElement);
