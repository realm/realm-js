////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

import { binding } from "../../binding";
import type { OrderedCollectionInternal } from "../OrderedCollection";
import type { TypeHelpers } from "../TypeHelpers";

type Getter<CollectionType, T> = (collection: CollectionType, index: number) => T;

type GetterFactoryOptions<T> = {
  fromBinding: TypeHelpers<T>["fromBinding"];
  itemType: binding.PropertyType;
};

/** @internal */
export function createDefaultGetter<CollectionType extends OrderedCollectionInternal, T>({
  fromBinding,
  itemType,
}: GetterFactoryOptions<T>): Getter<CollectionType, T> {
  const isObjectItem = itemType === binding.PropertyType.Object || itemType === binding.PropertyType.LinkingObjects;
  return isObjectItem ? (...args) => getObject(fromBinding, ...args) : (...args) => getKnownType(fromBinding, ...args);
}

function getObject<T>(
  fromBinding: TypeHelpers<T>["fromBinding"],
  collection: OrderedCollectionInternal,
  index: number,
): T {
  return fromBinding(collection.getObj(index));
}

function getKnownType<T>(
  fromBinding: TypeHelpers<T>["fromBinding"],
  collection: OrderedCollectionInternal,
  index: number,
): T {
  return fromBinding(collection.getAny(index));
}
