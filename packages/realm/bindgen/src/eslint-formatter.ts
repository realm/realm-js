import { createCommandFormatter } from "@realm/bindgen/formatter";

export const eslint = createCommandFormatter("eslint", ["npx", "eslint", "--fix", "--format=stylish"]);
