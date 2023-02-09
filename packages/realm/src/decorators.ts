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

/**
 * Decorators are not intended to be used at runtime and are removed from the source
 * by @realm/babel-plugin. Therefore, if a decorator is called, this means it is being
 * used outside of @realm/babel-plugin (or the plugin is incorrectly configured), so
 * we should throw
 */
class DecoratorError extends Error {
  constructor(name: string) {
    super(
      `The @${name} decorator cannot be used without the \`@realm/babel-plugin\` Babel plugin. Please check that you have installed and configured the Babel plugin.`,
    );
  }
}

export type IndexDecorator = (target: unknown, memberName: string) => void;

/**
 * Specify that the decorated field should be indexed by Realm.
 * See: [documentation](https://www.mongodb.com/docs/realm/sdk/react-native/examples/define-a-realm-object-model/#index-a-property)
 */
export const index: IndexDecorator = () => {
  throw new DecoratorError("index");
};

export type MapToDecorator = (realmPropertyName: string) => (target: unknown, memberName: string) => void;

/**
 * Specify that the decorated field should be remapped to a different property name in the Realm database.
 * See: [documentation](https://www.mongodb.com/docs/realm/sdk/react-native/examples/define-a-realm-object-model/#remap-a-property)
 *
 * @param realmPropertyName The name of the property in the Realm database
 */
export const mapTo = () => {
  throw new DecoratorError("mapTo");
};
