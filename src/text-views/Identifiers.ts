import { Identifiers } from "./TextViewTypes";

const JSON_POINTER_KEY = "jsonPointer=";

export function getID(component: Function, identifiers: Identifiers): string {
  return `${identifiers.editorID}|component=${component.name}|${JSON_POINTER_KEY}${identifiers.jsonPointer}`;
}

export function getJSONPointer(id: string): string | undefined {
  const index = id.lastIndexOf(JSON_POINTER_KEY);
  if (index < 0) {
    return undefined;
  }
  return id.slice(index + JSON_POINTER_KEY.length); // TODO check for off-by-one;
}
