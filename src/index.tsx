/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";
import App from "./App";

import { HTMLPhysicsSimulationElement } from "./html-custom-elements/HTMLPhysicsSimulationElement";

class DustLangEditor extends HTMLElement {
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
