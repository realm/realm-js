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

type DateType = Date;

declare namespace Realm {
  namespace Types {
    type Bool = boolean;
    type String = string;
    type Int = number;
    type Float = number;
    type Double = number;

    type Decimal128 = import("bson").Decimal128;
    const Decimal128: {
      new (): Decimal128;
    };

    type ObjectId = import("bson").ObjectId;
    const ObjectId: {
      new (): ObjectId;
    };

    type UUID = import("bson").UUID;
    const UUID: {
      new (): UUID;
    };

    type Date = DateType;
    const Date: {
      new (): Date;
    };

    type Data = ArrayBuffer;
    const Data: {
      new (): Data;
    };

    type List<T> = Realm.List<T>;
    type Set<T> = Realm.Set<T>;
    type Dictionary<T> = Realm.Dictionary<T>;
    type Mixed = unknown;
    type LinkingObjects<ObjectTypeT, LinkingPropertyName> = Realm.Results<ObjectTypeT>;
  }
}
