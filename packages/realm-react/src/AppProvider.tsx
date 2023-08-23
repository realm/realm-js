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
import React, { createContext, useContext, useLayoutEffect, useRef, useState } from "react";
import Realm from "realm";
import { AuthResult, OperationState } from "./types";

type AppContextValue = Realm.App | null;

/**
 * Create a context containing the Realm app.  Should be accessed with the useApp hook.
 */
const AppContext = createContext<AppContextValue>(null);

type AppOpStateValue = [AuthResult, React.Dispatch<React.SetStateAction<AuthResult>>] | null;

const AuthOperationContext = createContext<AppOpStateValue>(null);

type AuthOperationProps = { children: React.ReactNode };

const AuthOperationProvider: React.FC<AuthOperationProps> = ({ children }) => {
  const [authOpResult, setAuthOpResult] = useState<AuthResult>({
    state: OperationState.NotStarted,
    pending: false,
    success: false,
    error: undefined,
    operation: null,
  });
  return (
    <AuthOperationContext.Provider value={[authOpResult, setAuthOpResult]}>{children}</AuthOperationContext.Provider>
  );
};

/**
 * Props for the AppProvider component. These replicate the options which
 * can be used to create a Realm.App instance:
 * https://www.mongodb.com/docs/realm-sdks/js/latest/Realm.App.html#~AppConfiguration
 */
type AppProviderProps = Realm.AppConfiguration & {
  /**
   * A ref to the App instance. This is useful if you need to access the App
   * instance outside of a component that uses the App hooks.
   */
  appRef?: React.MutableRefObject<Realm.App | null>;
  children: React.ReactNode;
};

/**
 * React component providing a Realm App instance on the context for the
 * sync hooks to use. An `AppProvider` is required for an app to use the hooks.
 * @param appProps - The {@link Realm.AppConfiguration} for app services, passed as props.
 * @param appRef - A ref to the app instance, which can be used to access the app instance outside of the React component tree.
 */
export const AppProvider: React.FC<AppProviderProps> = ({ children, appRef, ...appProps }) => {
  const configuration = useRef<Realm.AppConfiguration>(appProps);

  const [app, setApp] = useState<Realm.App>(() => new Realm.App(configuration.current));

  // Support for a possible change in configuration
  if (!isEqual(appProps, configuration.current)) {
    configuration.current = appProps;

    try {
      setApp(new Realm.App(configuration.current));
    } catch (err) {
      console.error(err);
    }
  }

  useLayoutEffect(() => {
    if (appRef) {
      appRef.current = app;
    }
  }, [appRef, app]);

  return (
    <AppContext.Provider value={app}>
      <AuthOperationProvider>{children}</AuthOperationProvider>
    </AppContext.Provider>
  );
};

/**
 * Hook to access the current {@link Realm.App} from the {@link AppProvider} context.
 * @throws if an AppProvider does not exist in the component’s ancestors
 */
export const useApp = <
  FunctionsFactoryType extends Realm.DefaultFunctionsFactory,
  CustomDataType extends Record<string, unknown>,
>(): Realm.App<FunctionsFactoryType, CustomDataType> => {
  const app = useContext(AppContext);

  if (!app) {
    throw new Error("No app found. Did you forget to wrap your component in an <AppProvider>?");
  }
  return app as Realm.App<FunctionsFactoryType, CustomDataType>;
};

export const useAuthResult = () => {
  const authOperationStateHook = useContext(AuthOperationContext);

  if (!authOperationStateHook) {
    throw new Error(
      "Auth operation statue could not be determined. Did you forget to wrap your component in an <AppProvider>?",
    );
  }
  return authOperationStateHook;
};
