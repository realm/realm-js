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

import { BSON } from "realm";

// For this example app, the constant below is type annotated as `string` rather
// than inferred due to the equality check in `src/atlas-app-services/getAtlasApp.ts`
// verifying that this constant has been set.
export const ATLAS_APP_ID: string = "YOUR_APP_ID";
export const SYNC_STORE_ID = new BSON.ObjectId("6426106cb0ad9713140883ed");
