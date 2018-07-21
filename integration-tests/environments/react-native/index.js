/** @format */

// @see https://www.npmjs.com/package/node-libs-react-native#globals
import "node-libs-react-native/globals";

import { AppRegistry } from "react-native";
import { App } from "./src";
import { name as appName } from "./app.json";

AppRegistry.registerComponent(appName, () => App);
