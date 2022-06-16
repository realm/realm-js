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

// TODO: Delete this once the C++ binding generates these values

export var PropertyType;
(function (PropertyType) {
  PropertyType[(PropertyType["Int"] = 0)] = "Int";
  PropertyType[(PropertyType["Bool"] = 1)] = "Bool";
  PropertyType[(PropertyType["String"] = 2)] = "String";
  PropertyType[(PropertyType["Data"] = 3)] = "Data";
  PropertyType[(PropertyType["Date"] = 4)] = "Date";
  PropertyType[(PropertyType["Float"] = 5)] = "Float";
  PropertyType[(PropertyType["Double"] = 6)] = "Double";
  PropertyType[(PropertyType["Object"] = 7)] = "Object";
  PropertyType[(PropertyType["LinkingObjects"] = 8)] = "LinkingObjects";
  PropertyType[(PropertyType["Mixed"] = 9)] = "Mixed";
  PropertyType[(PropertyType["ObjectId"] = 10)] = "ObjectId";
  PropertyType[(PropertyType["Decimal"] = 11)] = "Decimal";
  PropertyType[(PropertyType["UUID"] = 12)] = "UUID";
  PropertyType[(PropertyType["Required"] = 0)] = "Required";
  PropertyType[(PropertyType["Nullable"] = 64)] = "Nullable";
  PropertyType[(PropertyType["Array"] = 128)] = "Array";
  PropertyType[(PropertyType["Set"] = 256)] = "Set";
  PropertyType[(PropertyType["Dictionary"] = 512)] = "Dictionary";
})(PropertyType || (PropertyType = {}));
