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

import { useCallback } from "react";
import { AuthError, OperationState } from "./types";
import { useAuthResult } from "./AppProvider";

// Convenience hook for tracking operation state.  This is used by all the auth hooks.
export function useAuthOperation<Args extends unknown[], Result>({
  operation,
  onSuccess = () => undefined,
}: {
  operation: (...args: Args) => Promise<Result | void>;
  onSuccess?: (...args: Args) => void;
}) {
  const [result, setResult] = useAuthResult();

  return useCallback<(...args: Args) => ReturnType<typeof operation>>(
    (...args) => {
      if (result.pending) {
        return Promise.reject("Another authentication operation is already in progress");
      }

      setResult({ state: OperationState.Pending, pending: true, success: false, error: undefined });
      return operation(...args)
        .then((res) => {
          setResult({ state: OperationState.Success, pending: false, success: true, error: undefined });
          onSuccess(...args);
          return res;
        })
        .catch((error) => {
          const authError = new AuthError(error);
          setResult({ state: OperationState.Error, pending: false, success: false, error: authError });
        });
    },
    [result, setResult, operation, onSuccess],
  );
}
