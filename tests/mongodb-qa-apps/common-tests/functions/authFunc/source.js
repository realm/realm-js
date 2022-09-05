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

/*
  This function will be run when a user logs in with this provider.

  The return object must contain a string id, this string id will be used to login with an existing
  or create a new user. This is NOT the Stitch user id, but it is the id used to identify which user has
  been created or logged in with. 

  If an error is thrown within the function the login will fail.

  The default function provided below will always result in failure.
*/

exports = (loginPayload) => {
  return loginPayload["realmCustomAuthFuncUserId"];
};
