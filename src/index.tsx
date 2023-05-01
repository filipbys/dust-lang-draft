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

function defineIfNotDefined(
  name: string,
  constructor: CustomElementConstructor,
  options?: ElementDefinitionOptions,
) {
  if (customElements.get(name) === undefined) {
    customElements.define(name, constructor, options);
  }
}

defineIfNotDefined(
  HTMLPhysicsSimulationElement.TAG,
  HTMLPhysicsSimulationElement,
);
defineIfNotDefined("dust-lang-editor", DustLangEditor);
