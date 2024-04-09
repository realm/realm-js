import { createCommandFormatter } from "@realm/bindgen/formatter";

export const trunk = createCommandFormatter("trunk", ["npx", "trunk", "fmt", "--force"]);
