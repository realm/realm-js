import { strict as assert } from "node:assert";
import { writeFileSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";
import { executeCommand } from "@realm/bindgen/formatter";

const ROOT_TS_CONFIG_PATH = new URL("../../tsconfig.json", import.meta.url).pathname;
assert(existsSync(ROOT_TS_CONFIG_PATH), `Expected a root tsconfig.json at '${ROOT_TS_CONFIG_PATH}'`);

export function typescriptChecker(cwd: string, filePaths: string[]) {
  // Write the tsconfig file
  const tsconfig = {
    extends: relative(cwd, ROOT_TS_CONFIG_PATH),
    files: filePaths.map((p) => relative(cwd, p)),
  };
  const tsconfigPath = resolve(cwd, "tsconfig.json");
  writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2), "utf8");
  // Run the tsc command, pointing using this tsconfig
  executeCommand(cwd, "npx", "tsc", "--project", tsconfigPath);
}

Object.defineProperty(typescriptChecker, "name", { value: "typescript-checker" });
