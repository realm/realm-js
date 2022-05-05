////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////
import { isEqual } from "lodash";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import Realm from "realm";

/**
 * Create a context containing the Realm app.  Should be accessed with the useApp hook.
 */
const AppContext = createContext<Realm.App | null>(null);

/**
 * Props for the AppProvider component. These replicate the options which
 * can be used to create a Realm.App instance:
 * https://www.mongodb.com/docs/realm-sdks/js/latest/Realm.App.html#~AppConfiguration
 */
type AppProviderProps = Realm.AppConfiguration;

/**
 * React component providing a Realm App instance on the context for the
 * sync hooks to use. An `AppProvider` is required for an app to use the hooks.
 */
export const AppProvider: React.FC<AppProviderProps> = ({ children, ...appProps }) => {
  const configuration = useRef<Realm.AppConfiguration>(appProps);

  const [app, setApp] = useState<Realm.App>(new Realm.App(configuration.current));

  // We increment `configVersion` when a config override passed as a prop
  // changes, which triggers a `useEffect` to overwrite the current App with the
  // new config
  const [configVersion, setConfigVersion] = useState(0);

  useEffect(() => {
    if (!isEqual(appProps, configuration.current)) {
      configuration.current = appProps;
      setConfigVersion((x) => x + 1);
    }
  }, [appProps]);

  // Support for a possible change in configuration
  useEffect(() => {
    try {
      const app = new Realm.App(configuration.current);
      setApp(app);
    } catch (err) {
      console.error(err);
    }
  }, [configVersion, setApp]);

  return <AppContext.Provider value={app}>{children}</AppContext.Provider>;
};

/**
 * Hook to access the current {@link Realm.App} from the {@link AppProvider} context.
 *
 * @throws if an AppProvider does not exist in the component’s ancestors
 */
export const useApp = (): Realm.App => {
  const app = useContext(AppContext);

  if (app === null) {
    throw new Error("AppContext not found.  Did you wrap your app in AppProvider?");
  }
  return app;
};
