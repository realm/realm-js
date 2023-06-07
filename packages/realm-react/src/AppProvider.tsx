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
import { AuthOperationName, AuthResult, OperationState } from "./types";

type AppContextValue = {
  app: Realm.App | null;
};

/**
 * Create a context containing the Realm app.  Should be accessed with the useApp hook.
 */
const AppContext = createContext<AppContextValue>({
  app: null,
});

type AppOpStateValue = {
  authOperationStateHook: [AuthResult, React.Dispatch<React.SetStateAction<AuthResult>>] | null;
};

const AuthOpStateContext = createContext<AppOpStateValue>({
  authOperationStateHook: null,
});

type AuthOpStateProviderProps = { children: React.ReactNode };

const AuthOpStateProvider: React.FC<AuthOpStateProviderProps> = ({ children }) => {
  const [authOpResult, setAuthOpResult] = useState<AuthResult>({
    state: OperationState.NotStarted,
    pending: false,
    success: false,
    error: undefined,
    currentOperation: AuthOperationName.None,
  });
  return (
    <AuthOpStateContext.Provider value={{ authOperationStateHook: [authOpResult, setAuthOpResult] }}>
      {children}
    </AuthOpStateContext.Provider>
  );
};

/**
 * Props for the AppProvider component. These replicate the options which
 * can be used to create a Realm.App instance:
 * https://www.mongodb.com/docs/realm-sdks/js/latest/Realm.App.html#~AppConfiguration
 */
type AppProviderProps = Realm.AppConfiguration & {
  children: React.ReactNode;
  appRef?: React.MutableRefObject<Realm.App | null>;
  logLevel?: Realm.App.Sync.LogLevel;
  logger?: (level: Realm.App.Sync.NumericLogLevel, message: string) => void;
};

function defaultLogger(level: Realm.App.Sync.NumericLogLevel, message: string) {
  console.log(`[${level}] ${message}`);
}

/**
 * React component providing a Realm App instance on the context for the
 * sync hooks to use. An `AppProvider` is required for an app to use the hooks.
 * @param appProps - The {@link Realm.AppConfiguration} for app services, passed as props.
 * @param appRef - A ref to the app instance, which can be used to access the app instance outside of the React component tree.
 * @param logLevel - The {@link Realm.App.Sync.LogLevel} to use for the app instance.
 * @param logger - A callback function to provide custom logging. It takes a {@link Realm.App.Sync.NumericLogLevel} and a message string as arguments.
 */
export const AppProvider: React.FC<AppProviderProps> = ({
  children,
  appRef,
  logLevel,
  logger = defaultLogger,
  ...appProps
}) => {
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
      if (logLevel) {
        Realm.App.Sync.setLogger(app, logger);
        Realm.App.Sync.setLogLevel(app, logLevel);
      }
    }
  }, [appRef, app, logLevel]);

  return (
    <AppContext.Provider value={{ app }}>
      <AuthOpStateProvider>{children}</AuthOpStateProvider>
    </AppContext.Provider>
  );
};

/**
 * Hook to access the current {@link Realm.App} from the {@link AppProvider} context.
 *
 * @throws if an AppProvider does not exist in the component’s ancestors
 */
export const useApp = <
  FunctionsFactoryType extends Realm.DefaultFunctionsFactory,
  CustomDataType extends Record<string, unknown>,
>(): Realm.App<FunctionsFactoryType, CustomDataType> => {
  const { app } = useContext(AppContext);

  if (!app) {
    throw new Error("No app found. Did you forget to wrap your component in an <AppProvider>?");
  }
  return app as Realm.App<FunctionsFactoryType, CustomDataType>;
};

export const useAuthResult = () => {
  const { authOperationStateHook } = useContext(AuthOpStateContext);

  if (!authOperationStateHook) {
    throw new Error(
      "Auth operation statue could not be determined. Did you forget to wrap your component in an <AppProvider>?",
    );
  }
  return authOperationStateHook;
};
