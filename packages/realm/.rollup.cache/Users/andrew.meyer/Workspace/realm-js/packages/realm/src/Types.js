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
import { BSON, Dictionary, List, RealmSet, Results } from "./internal";
const RealmDictionary = Dictionary;
const RealmList = List;
const RealmResults = Results;
const GlobalDate = Date;
// eslint-disable-next-line @typescript-eslint/no-namespace
export var Types;
(function (Types) {
    Types.Decimal128 = BSON.Decimal128;
    Types.ObjectId = BSON.ObjectId;
    Types.UUID = BSON.UUID;
    Types.Date = GlobalDate;
    Types.Data = ArrayBuffer;
    Types.List = RealmList;
    Types.Set = RealmSet;
    Types.Dictionary = RealmDictionary;
    Types.LinkingObjects = RealmResults;
})(Types || (Types = {}));
//# sourceMappingURL=Types.js.map