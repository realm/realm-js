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

import * as internal from "../internal";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace MongoDB {
  export import AggregatePipelineStage = internal.AggregatePipelineStage;
  export import BaseChangeEvent = internal.BaseChangeEvent;
  export import ChangeEvent = internal.ChangeEvent;
  export import ChangeEventId = internal.ChangeEventId;
  export import CountOptions = internal.CountOptions;
  export import DeleteEvent = internal.DeleteEvent;
  export import DeleteResult = internal.DeleteResult;
  export import Document = internal.Document;
  export import DocumentKey = internal.DocumentKey;
  export import DocumentNamespace = internal.DocumentNamespace;
  export import DropDatabaseEvent = internal.DropDatabaseEvent;
  export import DropEvent = internal.DropEvent;
  export import Filter = internal.Filter;
  export import FindOneAndModifyOptions = internal.FindOneAndModifyOptions;
  export import FindOneOptions = internal.FindOneOptions;
  export import FindOptions = internal.FindOptions;
  export import InsertEvent = internal.InsertEvent;
  export import InsertManyResult = internal.InsertManyResult;
  export import InsertOneResult = internal.InsertOneResult;
  export import InvalidateEvent = internal.InvalidateEvent;
  export import MongoDBCollection = internal.MongoDBCollection;
  export import NewDocument = internal.NewDocument;
  export import OperationType = internal.OperationType;
  export import RenameEvent = internal.RenameEvent;
  export import ReplaceEvent = internal.ReplaceEvent;
  export import Update = internal.Update;
  export import UpdateDescription = internal.UpdateDescription;
  export import UpdateEvent = internal.UpdateEvent;
  export import UpdateOptions = internal.UpdateOptions;
  export import UpdateResult = internal.UpdateResult;
}
