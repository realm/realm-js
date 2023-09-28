////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

import React, {createContext, useContext, useMemo, useReducer} from 'react';
import type {PropsWithChildren} from 'react';

type Logger = {
  info: (message: string) => void;
  error: (message: string) => void;
};

/**
 * Value available to consumers of the `LoggerContext`.
 */
type LoggerContextType = Logger;

/**
 * The logger context with initial value.
 */
const LoggerContext = createContext<LoggerContextType>({
  info: () => {},
  error: () => {},
});

/**
 * Value available to consumers of the `LoggerOutputContext`.
 */
type LoggerOutputContextType = string[];

/**
 * The logger output context with initial value.
 */
const LoggerOutputContext = createContext<LoggerOutputContextType>([]);

/**
 * Provides a logger for logging messages both to the `console`
 * and to the component used for displaying logs on the screen.
 *
 * @note
 * Displaying logs on the app screen is solely used for demoing
 * purposes in order to more easily show error messages arising
 * from various actions triggered.
 */
export function LoggerProvider({children}: PropsWithChildren) {
  const [output, addMessage] = useReducer(outputReducer, []);

  /**
   * Logger - This is meant to be replaced with a preferred
   * logging implementation.
   */
  const logger = useMemo(() => {
    return {
      info(message: string): void {
        addMessage(message);
        console.log(new Date().toLocaleString(), '|', message);
      },
      error(message: string): void {
        addMessage(message);
        console.log(new Date().toLocaleString(), '|', message);
      },
    };
  }, [addMessage]);

  return (
    <LoggerContext.Provider value={logger}>
      <LoggerOutputContext.Provider value={output}>
        {children}
      </LoggerOutputContext.Provider>
    </LoggerContext.Provider>
  );
}

/**
 * A reducer that only handles adding to the output.
 */
function outputReducer(state: string[], messageToAdd: string) {
  return [...state, messageToAdd];
}

/**
 * @returns The context value of the `LoggerContext.Provider`.
 */
export const useLogger = () => useContext(LoggerContext);

/**
 * @returns The context value of the `LoggerOutputContext.Provider`.
 */
export const useLoggerOutput = () => useContext(LoggerOutputContext);
