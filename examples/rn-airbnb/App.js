import "expo-dev-client";
import "react-native-get-random-values";
import React from "react";
import { registerRootComponent } from "expo";
import { SYNC_CONFIG } from "./sync.config";
import { AppWrapper } from "./app/AppWrapper";

export const App = () => <AppWrapper appId={SYNC_CONFIG.appId} />;

registerRootComponent(App);

export default App;
