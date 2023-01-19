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
  MutableSubscriptionSet,
  Realm,
  SyncError,
  SyncSession,
  TypeAssertionError,
  User,
  assert,
  binding,
  toBindingClientResetMode,
  toBindingErrorHandler,
  toBindingErrorHandlerWithOnManual,
  toBindingNotifyAfterClientReset,
  toBindingNotifyAfterClientResetWithfallback,
  toBindingNotifyBeforeClientReset,
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
  RecoverOrDiscardUnsyncedChanges = "recoverOrDiscardUnsyncedChanges",
}

export type ClientResetManualConfiguration = {
  mode: ClientResetMode.Manual;
  onManual?: ClientResetFallbackCallback;
};

export type ClientResetDiscardUnsyncedChangesConfiguration = {
  mode: ClientResetMode.DiscardUnsyncedChanges;
  onAfter?: ClientResetAfterCallback;
  onBefore?: ClientResetBeforeCallback;
};

export type ClientResetRecoverUnsyncedChangesConfiguration = {
  mode: ClientResetMode.RecoverUnsyncedChanges;
  onAfter?: ClientResetAfterCallback;
  onBefore?: ClientResetBeforeCallback;
  onFallback?: ClientResetFallbackCallback;
};

export type ClientResetRecoverOrDiscardUnsyncedChangesConfiguration = {
  mode: ClientResetMode.RecoverOrDiscardUnsyncedChanges;
  onAfter?: ClientResetAfterCallback;
  onBefore?: ClientResetBeforeCallback;
  onFallback?: ClientResetFallbackCallback;
};

export type ClientResetConfig =
  | ClientResetManualConfiguration
  | ClientResetDiscardUnsyncedChangesConfiguration
  | ClientResetRecoverUnsyncedChangesConfiguration
  | ClientResetRecoverOrDiscardUnsyncedChangesConfiguration;

export type BaseSyncConfiguration = {
  user: User;
  newRealmFileBehavior?: OpenRealmBehaviorConfiguration;
  existingRealmFileBehavior?: OpenRealmBehaviorConfiguration;
  onError?: ErrorCallback;
  customHttpHeaders?: Record<string, string>;
  /** @internal */
  _sessionStopPolicy?: SessionStopPolicy;
  clientReset?: ClientResetConfig;
};

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
  const { user, flexible, partitionValue, onError, _sessionStopPolicy, customHttpHeaders, clientReset } = config;

  return {
    user: user.internal,
    partitionValue: flexible ? undefined : EJSON.stringify(partitionValue),
    stopPolicy: _sessionStopPolicy
      ? toBindingStopPolicy(_sessionStopPolicy)
      : binding.SyncSessionStopPolicy.AfterChangesUploaded,
    customHttpHeaders,
    flxSyncRequested: !!flexible,
    ...parseClientResetConfig(clientReset, onError),
  };
}

/** @internal */
function parseClientResetConfig(clientReset: ClientResetConfig | undefined, onError: ErrorCallback | undefined) {
  if (!clientReset) {
    return {
      clientResyncMode: undefined,
      notifyBeforeClientReset: undefined,
      notifyAfterClientReset: undefined,
      errorHandler: onError ? toBindingErrorHandler(onError) : undefined,
    };
  }
  switch (clientReset.mode) {
    case ClientResetMode.Manual: {
      return parseManual(clientReset as ClientResetManualConfiguration, onError);
    }
    case ClientResetMode.DiscardUnsyncedChanges: {
      return {
        ...parseDiscardUnsyncedChanges(clientReset as ClientResetDiscardUnsyncedChangesConfiguration),
        errorHandler: onError ? toBindingErrorHandler(onError) : undefined,
      };
    }
    case ClientResetMode.RecoverUnsyncedChanges: {
      return {
        ...parseRecoverUnsyncedChanges(clientReset as ClientResetRecoverUnsyncedChangesConfiguration),
        errorHandler: onError ? toBindingErrorHandler(onError) : undefined,
      };
    }
    case ClientResetMode.RecoverOrDiscardUnsyncedChanges: {
      return {
        ...parseRecoverOrDiscardUnsyncedChanges(clientReset as ClientResetRecoverOrDiscardUnsyncedChangesConfiguration),
        errorHandler: onError ? toBindingErrorHandler(onError) : undefined,
      };
    }
  }
}

/** @internal */
function parseManual(clientReset: ClientResetManualConfiguration, onError: ErrorCallback | undefined) {
  return {
    clientResyncMode: toBindingClientResetMode(clientReset.mode),
    errorHandler: toBindingErrorHandlerWithOnManual(onError, clientReset.onManual),
  };
}

/** @internal */
function parseDiscardUnsyncedChanges(clientReset: ClientResetDiscardUnsyncedChangesConfiguration) {
  return {
    clientResyncMode: toBindingClientResetMode(clientReset.mode),
    notifyBeforeClientReset: clientReset.onBefore ? toBindingNotifyBeforeClientReset(clientReset.onBefore) : undefined,
    notifyAfterClientReset: clientReset.onAfter ? toBindingNotifyAfterClientReset(clientReset.onAfter) : undefined,
  };
}

/** @internal */
function parseRecoverUnsyncedChanges(clientReset: ClientResetRecoverUnsyncedChangesConfiguration) {
  return {
    clientResyncMode: toBindingClientResetMode(clientReset.mode),
    notifyBeforeClientReset: clientReset.onBefore ? toBindingNotifyBeforeClientReset(clientReset.onBefore) : undefined,
    notifyAfterClientReset: clientReset.onAfter
      ? toBindingNotifyAfterClientResetWithfallback(clientReset.onAfter, clientReset.onFallback)
      : undefined,
  };
}

/** @internal */
function parseRecoverOrDiscardUnsyncedChanges(clientReset: ClientResetRecoverOrDiscardUnsyncedChangesConfiguration) {
  return {
    clientResyncMode: toBindingClientResetMode(clientReset.mode),
    notifyBeforeClientReset: clientReset.onBefore ? toBindingNotifyBeforeClientReset(clientReset.onBefore) : undefined,
    notifyAfterClientReset: clientReset.onAfter
      ? toBindingNotifyAfterClientResetWithfallback(clientReset.onAfter, clientReset.onFallback)
      : undefined,
  };
}

/**
 * Validate the fields of a user-provided realm sync configuration.
 */
export function validateSyncConfiguration(config: unknown): asserts config is SyncConfiguration {
  assert.object(config, "'sync' on realm configuration", { allowArrays: false });
  const { user, newRealmFileBehavior, existingRealmFileBehavior, onError, customHttpHeaders, clientReset, flexible } =
    config;

  assert.instanceOf(user, User, "'user' on realm sync configuration");
  if (newRealmFileBehavior !== undefined) {
    validateOpenRealmBehaviorConfiguration(newRealmFileBehavior, "newRealmFileBehavior");
  }
  if (existingRealmFileBehavior !== undefined) {
    validateOpenRealmBehaviorConfiguration(existingRealmFileBehavior, "existingRealmFileBehavior");
  }
  if (onError !== undefined) {
    assert.function(onError, "'onError' on realm sync configuration");
  }
  if (customHttpHeaders !== undefined) {
    assert.object(customHttpHeaders, "'customHttpHeaders' on realm sync configuration", { allowArrays: false });
    for (const key in customHttpHeaders) {
      assert.string(customHttpHeaders[key], "all property values of 'customHttpHeaders' on realm sync configuration");
    }
  }
  if (clientReset !== undefined) {
    validateClientResetConfiguration(clientReset);
  }
  // Assume the user intends to use Flexible Sync for all truthy values provided.
  if (flexible) {
    validateFlexibleSyncConfiguration(config);
  } else {
    validatePartitionSyncConfiguration(config);
  }
}

/**
 * Validate the fields of a user-provided open realm behavior configuration.
 */
function validateOpenRealmBehaviorConfiguration(
  config: unknown,
  target: string,
): asserts config is OpenRealmBehaviorConfiguration {
  assert.object(config, `'${target}' on realm sync configuration`, { allowArrays: false });
  assert(
    config.type === OpenRealmBehaviorType.DownloadBeforeOpen || config.type === OpenRealmBehaviorType.OpenImmediately,
    `'${target}.type' on realm sync configuration must be either '${OpenRealmBehaviorType.DownloadBeforeOpen}' or '${OpenRealmBehaviorType.OpenImmediately}'.`,
  );
  if (config.timeOut !== undefined) {
    assert.number(config.timeOut, `'${target}.timeOut' on realm sync configuration`);
  }
  if (config.timeOutBehavior !== undefined) {
    assert(
      config.timeOutBehavior === OpenRealmTimeOutBehavior.OpenLocalRealm ||
        config.timeOutBehavior === OpenRealmTimeOutBehavior.ThrowException,
      `'${target}.timeOutBehavior' on realm sync configuration must be either '${OpenRealmTimeOutBehavior.OpenLocalRealm}' or '${OpenRealmTimeOutBehavior.ThrowException}'.`,
    );
  }
}

/**
 * Validate the fields of a user-provided client reset configuration.
 */
function validateClientResetConfiguration(config: unknown): asserts config is ClientResetConfig {
  assert.object(config, "'clientReset' on realm sync configuration", { allowArrays: false });
  const modes = [
    ClientResetMode.Manual,
    ClientResetMode.DiscardUnsyncedChanges,
    ClientResetMode.RecoverUnsyncedChanges,
    ClientResetMode.RecoverOrDiscardUnsyncedChanges,
  ];
  assert(
    modes.includes(config.mode as ClientResetMode),
    `'clientReset' on realm sync configuration must be one of the following: '${modes.join("', '")}'`,
  );
  if (config.onManual !== undefined) {
    assert.function(config.onManual, "'clientReset.onManual' on realm sync configuration");
  }
  if (config.onAfter !== undefined) {
    assert.function(config.onAfter, "'clientReset.onAfter' on realm sync configuration");
  }
  if (config.onBefore !== undefined) {
    assert.function(config.onBefore, "'clientReset.onBefore' on realm sync configuration");
  }
  if (config.onFallback !== undefined) {
    assert.function(config.onFallback, "'clientReset.onFallback' on realm sync configuration");
  }
}

/**
 * Validate the fields of a user-provided realm flexible sync configuration.
 */
function validateFlexibleSyncConfiguration(
  config: Record<string, unknown>,
): asserts config is FlexibleSyncConfiguration {
  const { flexible, partitionValue, initialSubscriptions } = config;

  assert(
    flexible === true,
    "'flexible' must always be true for realms using flexible sync. To enable partition-based sync, remove 'flexible' and specify 'partitionValue'.",
  );
  if (initialSubscriptions !== undefined) {
    assert.object(initialSubscriptions, "'initialSubscriptions' on realm sync configuration", { allowArrays: false });
    assert.function(initialSubscriptions.update, "'initialSubscriptions.update' on realm sync configuration");
    if (initialSubscriptions.rerunOnOpen !== undefined) {
      assert.boolean(
        initialSubscriptions.rerunOnOpen,
        "'initialSubscriptions.rerunOnOpen' on realm sync configuration",
      );
    }
  }
  assert(
    partitionValue === undefined,
    "'partitionValue' cannot be specified when flexible sync is enabled. To enable partition-based sync, remove 'flexible' and specify 'partitionValue'.",
  );
}

/**
 * Validate the fields of a user-provided realm partition sync configuration.
 */
function validatePartitionSyncConfiguration(
  config: Record<string, unknown>,
): asserts config is PartitionSyncConfiguration {
  const { flexible, partitionValue, initialSubscriptions } = config;

  validatePartitionValue(partitionValue);
  assert(
    // TODO: Our TS types do not allow `flexible` to be anything other than `undefined`
    //       for partition sync. But one of our tests assumes `flexible: false` is allowed.
    //       Need to decide which one to enforce.
    flexible === undefined,
    "'flexible' can only be specified to enable flexible sync. To enable flexible sync, remove 'partitionValue' and set 'flexible' to true.",
  );
  assert(
    initialSubscriptions === undefined,
    "'initialSubscriptions' can only be specified when flexible sync is enabled. To enable flexible sync, remove 'partitionValue' and set 'flexible' to true.",
  );
}

/**
 * Validate the user-provided partition value of a realm sync configuration.
 */
function validatePartitionValue(value: unknown): asserts value is PartitionValue {
  if (typeof value === "number") {
    assert(
      Number.isInteger(value),
      `Expected 'partitionValue' on realm sync configuration to be an integer, got ${
        Number.isNaN(value) ? "NaN" : "a decimal number"
      }.`,
    );
    assert(
      value >= Number.MIN_SAFE_INTEGER && value <= Number.MAX_SAFE_INTEGER,
      `Expected 'partitionValue' on realm sync configuration to be between Number.MIN_SAFE_INTEGER and Number.MAX_SAFE_INTEGER.`,
    );
  } else {
    assert(
      typeof value === "string" || value instanceof ObjectId || value instanceof UUID || value === null,
      `Expected 'partitionValue' on realm sync configuration to be an integer, string, ObjectId, UUID, or null, got ${TypeAssertionError.deriveType(
        value,
      )}.`,
    );
  }
}
