////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

import { isDevelopmentMode } from "./environment";

/**
 * Display a deprecation warning for features being removed in the next major version
 * to users in development mode (as best as we can detect this, see `isDevelopmentMode`)
 *
 * @param deprecatedItem The method signature or name of the deprecated item
 * @param suggestedReplacement The method signature or name of the suggested replacement
 */
export const deprecationWarning = (deprecatedItem: string, suggestedReplacement: string): void => {
  if (!isDevelopmentMode) return;

  console.warn(
    `Deprecation warning from Realm: ${deprecatedItem} is deprecated and will be removed in a future major release. Consider switching to ${suggestedReplacement}.`,
  );
};

/**
 * Helper function for migrating from positional arguments to a single dictionary argument.
 * Check the arguments passed to a function, if the first argument is not an object (i.e. it
 * is presumed to be a deprecated positional-style call), shows a deprecation warning and
 * converts the positional arguments into an object matching the expected "new" shape.
 *
 * @param args Array of arguments passed to the function (captured with `...args`).
 * @param methodName The name of the method, used to show the deprecation warning.
 * @param argNames The list of positional argument names, used to covert them into
 * an object if a deprecated call is made and to show the deprecation warning.
 * @param hasRestArgs Optional flag indicating that the function's final argument is
 * `...args` (to capture any extra arguments), in which case we capture them and return
 * as the second element of the return array.
 *
 * @returns An object containing:
 *
 * argsObject: a dictionary of function arguments, either passed through from args[0] if
 * args[0] is an object, or created from `args` and `argNames` if the args are a
 * deprecated positional argument call.
 *
 * restArgs: an array of the "...args" passed to the function if `hasRestArgs` is true;
 * otherwise it is `undefined`.
 */
// Allow use of `object` type
// eslint-disable-next-line @typescript-eslint/ban-types
export const handleDeprecatedPositionalArgs = <T extends object>(
  args: [T, ...unknown[]] | unknown[],
  methodName: string,
  argNames: (keyof T)[],
  hasRestArgs?: boolean,
): { argsObject: T; restArgs: unknown[] | undefined } => {
  if (typeof args[0] !== "object") {
    const restArgsText = hasRestArgs ? ", ...args" : "";

    deprecationWarning(
      `${methodName}(${argNames.join(", ")}${restArgsText})`,
      `${methodName}({ ${argNames.join(", ")} }${restArgsText})`,
    );

    // Convert the array of arguments into a dictionary keyed by the relevant argName
    const argsObject = argNames.reduce((prev, argName, index) => {
      return { ...prev, [argName]: args[index] };
    }, {} as T);

    const restArgs = hasRestArgs ? args.slice(argNames.length) : undefined;

    return { argsObject, restArgs };
  }

  return { argsObject: args[0] as T, restArgs: hasRestArgs ? args.slice(1) : undefined };
};
