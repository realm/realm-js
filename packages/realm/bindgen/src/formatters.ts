import { createCommandFormatter } from "@realm/bindgen/formatter";

export const eslintFormatter = createCommandFormatter("eslint", ["npx", "eslint", "--fix", "--format=stylish"]);
export const trunkFormatter = createCommandFormatter("trunk", ["npx", "trunk", "fmt", "--force"]);
