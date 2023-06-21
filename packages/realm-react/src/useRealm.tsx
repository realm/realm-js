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
import Realm from "realm";
import { useContext } from "react";

/**
 * Generates a `useRealm` hook given a RealmContext.  This allows access to the {@link Realm}
 * instance anywhere within the RealmProvider.
 * @param RealmContext - The context containing the {@link Realm} instance
 * @returns useRealm - Hook that is used to gain access to the {@link Realm} instance
 */
export const createUseRealm = (RealmContext: React.Context<Realm | null>) => {
  return function useRealm(): Realm {
    // This is the context setup by `createRealmContext`
    const context = useContext(RealmContext);
    if (context === null) {
      throw new Error("Realm context not found.  Did you call useRealm() within a <RealmProvider/>?");
    }
    return context;
  };
};
