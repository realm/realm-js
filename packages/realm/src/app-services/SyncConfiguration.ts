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
  toBindingClientResetMode,
  toBindingErrorHandler,
  toBindingStopPolicy,
  toBindingNotifyBeforeClientReset,
  toBindingNotifyAfterClientReset,
  toBindingNotifyAfterClientResetWithfallback,
  toBindingErrorHandlerWithOnManual,
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
export type ClientResetFallbackCallback = (session: SyncSession, path: string) => void;
export type ClientResetBeforeCallback = (localRealm: Realm) => void;
export type ClientResetAfterCallback = (localRealm: Realm, remoteRealm: Realm) => void;

export enum SessionStopPolicy {
  AfterUpload = "after-upload",
  Immediately = "immediately",
  Never = "never",
}

export enum ClientResetMode {
  Manual = "manual",
  DiscardUnsyncedChanges = "discardUnsyncedChanges",
  RecoverUnsyncedChanges = "recoverUnsyncedChanges",
  RecoverOrDiscard = "recoverOrDiscard",
}

export type ClientReset = {
  mode: ClientResetMode;
  onAfter?: ClientResetAfterCallback;
  onBefore?: ClientResetBeforeCallback;
  onFallback?: ClientResetFallbackCallback;
  onManual?: ClientResetFallbackCallback;
};

export type BaseSyncConfiguration = {
  user: User;
  newRealmFileBehavior?: OpenRealmBehaviorConfiguration;
  existingRealmFileBehavior?: OpenRealmBehaviorConfiguration;
  onError?: ErrorCallback;
  customHttpHeaders?: Record<string, string>;
  /** @internal */
  _sessionStopPolicy?: SessionStopPolicy; // TODO: Why is this _ prefixed?
  clientReset?: ClientReset;
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
  const { user, onError, _sessionStopPolicy, customHttpHeaders, clientReset } = config;
  assert.instanceOf(user, User, "user");
  validatePartitionValue(config.partitionValue);
  const partitionValue = EJSON.stringify(config.partitionValue as EJSON.SerializableTypes);
  return {
    user: config.user.internal,
    partitionValue,
    stopPolicy: _sessionStopPolicy
      ? toBindingStopPolicy(_sessionStopPolicy)
      : binding.SyncSessionStopPolicy.AfterChangesUploaded,
    customHttpHeaders: customHttpHeaders,
    ...parseClientReset(clientReset, onError),
  };
}

/** @internal */
function parseClientReset(clientReset: ClientReset | undefined, onError: ErrorCallback | undefined) {
  if (!clientReset) {
    return {
      clientResyncMode: undefined,
      notifyBeforeClientReset: undefined,
      notifyAfterClientReset: undefined,
    };
  }
  switch (clientReset.mode) {
    case ClientResetMode.Manual: {
      return parseManual(clientReset, onError);
    }
    case ClientResetMode.DiscardUnsyncedChanges: {
      return parseDiscardUnsyncedChanges(clientReset, onError);
    }
    case ClientResetMode.RecoverUnsyncedChanges: {
      return parseRecoverUnsyncedChanges(clientReset, onError);
    }
    case ClientResetMode.RecoverOrDiscard: {
      return parseRecoverOrDiscard(clientReset, onError);
    }
  }
}

/** @internal */
function parseManual(clientReset: ClientReset, onError: ErrorCallback | undefined) {
  return {
    clientResyncMode: toBindingClientResetMode(clientReset.mode),
    errorHandler: toBindingErrorHandlerWithOnManual(onError, clientReset.onManual),
  };
}

/** @internal */
function parseDiscardUnsyncedChanges(clientReset: ClientReset, onError: ErrorCallback | undefined) {
  return {
    clientResyncMode: toBindingClientResetMode(clientReset.mode),
    notifyBeforeClientReset: clientReset.onBefore ? toBindingNotifyBeforeClientReset(clientReset.onBefore) : undefined,
    notifyAfterClientReset: clientReset.onAfter ? toBindingNotifyAfterClientReset(clientReset.onAfter) : undefined,
    errorHandler: onError ? toBindingErrorHandler(onError) : undefined,
  };
}

/** @internal */
function parseRecoverUnsyncedChanges(clientReset: ClientReset, onError: ErrorCallback | undefined) {
  return {
    clientResyncMode: toBindingClientResetMode(clientReset.mode),
    notifyBeforeClientReset: clientReset.onBefore ? toBindingNotifyBeforeClientReset(clientReset.onBefore) : undefined,
    notifyAfterClientReset: clientReset.onAfter
      ? toBindingNotifyAfterClientResetWithfallback(clientReset.onAfter, clientReset.onFallback)
      : undefined,
    errorHandler: onError ? toBindingErrorHandler(onError) : undefined,
  };
}

/** @internal */
function parseRecoverOrDiscard(clientReset: ClientReset, onError: ErrorCallback | undefined) {
  return {
    clientResyncMode: toBindingClientResetMode(clientReset.mode),
    notifyBeforeClientReset: clientReset.onBefore ? toBindingNotifyBeforeClientReset(clientReset.onBefore) : undefined,
    notifyAfterClientReset: clientReset.onAfter
      ? toBindingNotifyAfterClientResetWithfallback(clientReset.onAfter, clientReset.onFallback)
      : undefined,
    errorHandler: onError ? toBindingErrorHandler(onError) : undefined,
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

