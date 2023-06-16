import { IfThenMacro } from "./IfThenMacro";
import { ModuleMacro } from "./physics-containers/ModuleMacro";
import { TextGroupMacro } from "./TextViewTypes";

export const MACROS: Map<string, TextGroupMacro> = new Map([
  ["module", ModuleMacro],
  ["if", IfThenMacro],
  // TODO case expressions, loops, collections (bags, sets, tables, graphs, trees), state machines, etc
]);
