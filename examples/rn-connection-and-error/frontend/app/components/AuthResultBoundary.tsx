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

import React, {useEffect} from 'react';
import type {PropsWithChildren} from 'react';
import {useAuth} from '@realm/react';

import {logger} from '../utils/logger';

/**
 * Component for handling (logging in this case) changes in the auth
 * result which is triggered by `@realm/react`'s auth operations.
 *
 * @note
 * This boundary is best used in between `@realm/react`'s `AuthProvider`
 * and `UserProvider` in the React tree hierarchy. Placing this below
 * the `UserProvider` may cause it to unmount prior to logging all
 * messages when a user logs in and out.
 */
export function AuthResultBoundary({children}: PropsWithChildren) {
  const {result} = useAuth();

  useEffect(() => {
    if (result.error) {
      logger.error(
        `Failed operation '${result.operation}': ${result.error.message}`,
      );
    } else if (result.success) {
      logger.info(`Successful operation '${result.operation}'.`);
    }
  }, [result.error, result.operation, result.success]);

  return <>{children}</>;
}
