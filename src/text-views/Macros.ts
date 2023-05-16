import { IfThenMacro } from "./IfThenMacro";
import { ModuleMacro } from "./ModuleMacro";
import { TextGroupMacro } from "./TextViewTypes";

export const MACROS: Map<string, TextGroupMacro> = new Map([
  ["module", ModuleMacro],
  ["if", IfThenMacro],
  //   TOOD case, etc
]);
