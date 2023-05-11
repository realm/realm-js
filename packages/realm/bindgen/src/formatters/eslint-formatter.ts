import { createCommandFormatter } from "@realm/bindgen/formatter";

export const eslintFormatter = createCommandFormatter("eslint", ["npx", "eslint", "--fix", "--format=stylish"]);
