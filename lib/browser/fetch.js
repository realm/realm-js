////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

"use strict";

import { objectTypes } from "./constants";
import { callMethod, registerTypeConverter } from "./rpc";

export function performFetch(request, responseHandler) {
  const { url, ...init } = request;
  if (typeof url !== "string") {
    throw new Error("Expected a URL");
  }
  if (typeof responseHandler !== "object") {
    throw new Error("Expected a response handler object");
  }
  const { onSuccess, onError } = responseHandler;
  // Delegate to fetch
  fetch(url, init).then(async (response) => {
    const decodedBody = await response.text();
    // Pull out the headers of the response
    const headers = {};
    response.headers.forEach((value, key) => {
        headers[key] = value;
    });
    return {
          statusCode: response.status,
          headers,
          body: decodedBody,
    };
  }).then(onSuccess, onError);
}

function deserializeResponseHandler(realmId, info) {
  const { id } = info;
  if (typeof id !== "number") {
    throw new Error("Expected a nummeric id");
  }
  return {
    onSuccess: function() {
      callMethod(undefined, id, "onSuccess", Array.from(arguments));
    },
    onError: function() {
      callMethod(undefined, id, "onError", Array.from(arguments));
    },
  }
}

registerTypeConverter(objectTypes.FETCHRESPONSEHANDLER, deserializeResponseHandler);
