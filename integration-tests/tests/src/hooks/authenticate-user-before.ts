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
import { Credentials } from "realm";

export function authenticateUserBefore(): void {
  before("authenticateUserBefore", async function (this: AppContext & Partial<UserContext>) {
    if (this.app) {
      this.user = this.app.currentUser || (await this.app.logIn(Credentials.anonymous()));
    } else {
      throw new Error("Missing app on context. Did you forget to use the importAppBefore hook?");
    }
  });
}
