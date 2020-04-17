import * as fs from "fs-extra";
import * as path from "path";

/* eslint-disable no-console */

const packagePath = path.resolve(__dirname, "..");
const packageTypesPath = path.resolve(packagePath, "types");
const rootPath = path.resolve(packagePath, "../..");
const rootTypesPath = path.resolve(rootPath, "types");

// Delete any types already copied
console.log(`Deleting existing types (from ${packageTypesPath})`);
fs.removeSync(packageTypesPath);
// (Re-)create the directory
fs.copySync(rootTypesPath, packageTypesPath);
