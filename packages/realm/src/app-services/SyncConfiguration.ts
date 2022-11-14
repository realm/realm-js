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

import { EJSON, ObjectId, UUID } from "bson";

import {
  BSON,
  ClientResetError,
  Realm,
  SyncError,
  SyncSession,
  User,
  assert,
  binding,
  toBindingErrorHandler,
  toBindingStopPolicy,
} from "../internal";

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

export type ErrorCallback = (session: SyncSession, error: SyncError | ClientResetError) => void;

export enum SessionStopPolicy {
  AfterUpload = "after-upload",
  Immediately = "immediately",
  Never = "never",
}

export type BaseSyncConfiguration = {
  user: User;
  newRealmFileBehavior?: OpenRealmBehaviorConfiguration;
  existingRealmFileBehavior?: OpenRealmBehaviorConfiguration;
  onError?: ErrorCallback;
  /** @internal */
  _sessionStopPolicy?: SessionStopPolicy; // TODO: Why is this _ prefixed?
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

/** @internal */
export function toBindingSyncConfig(config: SyncConfiguration): binding.SyncConfig_Relaxed {
  if (config.flexible) {
    throw new Error("Flexible sync has not been implemented yet");
  }
  const { user, onError, _sessionStopPolicy } = config;
  assert.instanceOf(user, User, "user");
  validatePartitionValue(config.partitionValue);
  const partitionValue = EJSON.stringify(config.partitionValue as EJSON.SerializableTypes);
  return {
    user: config.user.internal,
    partitionValue,
    errorHandler: onError ? toBindingErrorHandler(onError) : undefined,
    stopPolicy: _sessionStopPolicy
      ? toBindingStopPolicy(_sessionStopPolicy)
      : binding.SyncSessionStopPolicy.AfterChangesUploaded,
  };
}

/** @internal */
function validatePartitionValue(pv: unknown) {
  if (typeof pv === "number") {
    validateNumberValue(pv);
    return;
  }
  if (!(pv instanceof ObjectId || pv instanceof UUID || typeof pv === "string" || pv === null)) {
    throw new Error(pv + " is not an allowed PartitionValue");
  }
}

/** @internal */
function validateNumberValue(numberValue: number) {
  if (!Number.isInteger(numberValue)) {
    throw new Error("PartitionValue " + numberValue + " must be of type integer");
  }
  if (numberValue > Number.MAX_SAFE_INTEGER) {
    throw new Error("PartitionValue " + numberValue + " is greater than Number.MAX_SAFE_INTEGER");
  }
  if (numberValue < Number.MIN_SAFE_INTEGER) {
    throw new Error("PartitionValue " + numberValue + " is lesser than Number.MIN_SAFE_INTEGER");
  }
}
