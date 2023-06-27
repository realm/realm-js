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

import { Fetcher, AuthenticatedRequest, UserContext } from "../../Fetcher";
import { User } from "../../User";

import { MockNetworkTransport } from "./MockNetworkTransport";

/**
 * A mock of the fetcher useful when testing.
 */
export class MockFetcher extends Fetcher {
  private readonly mockUserContext: UserContext;
  private readonly mockTransport: MockNetworkTransport;

  /**
   * Construct a mocked network transport which returns pre-recorded requests.
   * @param responses An array of pre-recorded requests.
   * @param userContext An object defining the current user.
   */
  constructor(responses: unknown[] = [], userContext: UserContext = { currentUser: null }) {
    const mockTransport = new MockNetworkTransport(responses);
    super({
      appId: "mocked-app-id",
      userContext: userContext,
      locationUrlContext: {
        locationUrl: Promise.resolve("http://localhost:1337"),
      },
      transport: mockTransport,
    });
    this.mockTransport = mockTransport;
    this.mockUserContext = userContext;
  }

  set currentUser(user: User | null) {
    this.mockUserContext.currentUser = user;
  }

  /**
   * @returns List of all requests captured.
   */
  public get requests(): AuthenticatedRequest<any>[] {
    return this.mockTransport.requests;
  }
}
