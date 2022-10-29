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

import { EJSON } from "bson";

import { App, BSON, Realm, SyncSession, User, assert, binding } from "../internal";

export type PartitionValue = string | number | BSON.ObjectId | BSON.UUID | null;

export enum OpenRealmBehaviorType {
  DownloadBeforeOpen = "downloadBeforeOpen",
  OpenImmediately = "openImmediately",
}

export enum OpenRealmTimeOutBehavior {
  OpenLocalRealm = "openLocalRealm",
  ThrowException = "throwException",
}

export type OpenRealmBehaviorConfiguration = {
  type: OpenRealmBehaviorType;
  timeOut?: number;
  timeOutBehavior?: OpenRealmTimeOutBehavior;
};

export type SyncError = {
  name: string;
  message: string;
  isFatal: boolean;
  category?: string;
  code: number;
};

export type ErrorCallback = (session: SyncSession, error: SyncError) => void;

export type BaseSyncConfiguration = {
  user: User;
  newRealmFileBehavior?: OpenRealmBehaviorConfiguration;
  existingRealmFileBehavior?: OpenRealmBehaviorConfiguration;
  onError?: ErrorCallback;
};

// TODO: Delete once the flexible sync API gets implemented
type MutableSubscriptionSet = unknown;

export type FlexibleSyncConfiguration = BaseSyncConfiguration & {
  flexible: true;
  partitionValue?: never;
  initialSubscriptions?: {
    /**
     * Callback called with the {@link Realm} instance to allow you to setup the
     * initial set of subscriptions by calling `realm.subscriptions.update`.
     * See {@link Realm.App.Sync.SubscriptionSet.update} for more information.
     */
    update: (subs: MutableSubscriptionSet, realm: Realm) => void;
    /**
     * If `true`, the {@link update} callback will be rerun every time the Realm is
     * opened (e.g. every time a user opens your app), otherwise (by default) it
     * will only be run if the Realm does not yet exist.
     */
    rerunOnOpen?: boolean;
  };
};

export type PartitionSyncConfiguration = BaseSyncConfiguration & {
  flexible?: never;
  partitionValue: PartitionValue;
  initialSubscriptions?: never;
};

export type SyncConfiguration = FlexibleSyncConfiguration | PartitionSyncConfiguration;

/*
function fromBindingSyncError(error: binding.SyncError): SyncError {
  return {
    name: error.errorCode.name,
    code: error.errorCode.code,
    category: error.errorCode.category,
    message: error.message, // or error.errorCode.message
    isFatal: error.isFatal,
  };
}
*/

/** @internal */
export function toBindingSyncConfig(config: SyncConfiguration): binding.SyncConfig_Relaxed {
  if (config.flexible) {
    throw new Error("Flexible sync has not been implemented yet");
  }
  const { user, onError } = config;
  assert.instanceOf(user, User, "user");
  const partitionValue = EJSON.stringify(config.partitionValue as EJSON.SerializableTypes);
  return {
    user: config.user.internal,
    partitionValue,
    /*
    errorHandler: onError
      ? (_sessionInternal, bindingError) => {
          // TODO: Convert binding's session to SDK session, possibly via user
          const session = App.Sync.getSyncSession(user, partitionValue);
          const error = fromBindingSyncError(bindingError);
          onError(session, error);
        }
      : undefined,
    */
  };
}
