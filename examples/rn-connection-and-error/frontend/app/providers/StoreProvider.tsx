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

import React, {createContext, useContext} from 'react';
import type {PropsWithChildren} from 'react';
import {useObject} from '@realm/react';

import {SYNC_STORE_ID} from '../atlas-app-services/config';
import {Store} from '../models/Store';

/**
 * Value available to consumers of the `StoreContext`.
 */
type StoreContextType = Store | null;

/**
 * The store context with initial value.
 */
const StoreContext = createContext<StoreContextType>(null);

/**
 * Queries and provides the relevant store using `@realm/react`, as well as
 * providing functions for adding, updating, and deleting products.
 */
export function StoreProvider({children}: PropsWithChildren) {
  const store = useObject(Store, SYNC_STORE_ID);

  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
}

/**
 * @returns The context value of the `StoreContext.Provider`.
 */
export const useStore = () => useContext(StoreContext);
