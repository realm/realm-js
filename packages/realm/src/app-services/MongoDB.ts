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

import * as ns from "./MongoDBCollection";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace MongoDB {
  export import AggregatePipelineStage = ns.AggregatePipelineStage;
  export import BaseChangeEvent = ns.BaseChangeEvent;
  export import ChangeEvent = ns.ChangeEvent;
  export import ChangeEventId = ns.ChangeEventId;
  export import CountOptions = ns.CountOptions;
  export import DeleteEvent = ns.DeleteEvent;
  export import DeleteResult = ns.DeleteResult;
  export import Document = ns.Document;
  export import DocumentKey = ns.DocumentKey;
  export import DocumentNamespace = ns.DocumentNamespace;
  export import DropDatabaseEvent = ns.DropDatabaseEvent;
  export import DropEvent = ns.DropEvent;
  export import Filter = ns.Filter;
  export import FindOneAndModifyOptions = ns.FindOneAndModifyOptions;
  export import FindOneOptions = ns.FindOneOptions;
  export import FindOptions = ns.FindOptions;
  export import InsertEvent = ns.InsertEvent;
  export import InsertManyResult = ns.InsertManyResult;
  export import InsertOneResult = ns.InsertOneResult;
  export import InvalidateEvent = ns.InvalidateEvent;
  export import MongoDBCollection = ns.MongoDBCollection;
  export import NewDocument = ns.NewDocument;
  export import OperationType = ns.OperationType;
  export import RenameEvent = ns.RenameEvent;
  export import ReplaceEvent = ns.ReplaceEvent;
  export import Update = ns.Update;
  export import UpdateDescription = ns.UpdateDescription;
  export import UpdateEvent = ns.UpdateEvent;
  export import UpdateOptions = ns.UpdateOptions;
  export import UpdateResult = ns.UpdateResult;
}
