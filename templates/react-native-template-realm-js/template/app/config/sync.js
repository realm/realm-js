////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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
export const SYNC_CONFIG = {
  // Set `enabled` to `true` to enable sync. See `AppWrapper.tsx` for the relevant code.
  enabled: true,
  // Add your Realm App ID here if sync is enabled.
  realmAppId: 'application-0-ppxve',
  // Set `anonymousAuthEnabled` to allow anonymous login.
  // See https://docs.mongodb.com/realm/authentication/anonymous/ for more information.
  anonymousAuthEnabled: false,
};
