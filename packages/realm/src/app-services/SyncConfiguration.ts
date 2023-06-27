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
  AnyUser,
  BSON,
  ClientResetError,
  MutableSubscriptionSet,
  Realm,
  SubscriptionSet,
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
  toBindingNotifyAfterClientResetWithFallback,
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

/**
 */
export enum ClientResetMode {
  /** @deprecated See {@link Realm.App.Sync.initiateClientReset} */
  Manual = "manual",
  /** Download a fresh copy from the server. */
  DiscardUnsyncedChanges = "discardUnsyncedChanges",
  /** Merged remote and local, unsynced changes. */
  RecoverUnsyncedChanges = "recoverUnsyncedChanges",
  /* Download a fresh copy from the server if recovery of unsynced changes is not possible. */
  RecoverOrDiscardUnsyncedChanges = "recoverOrDiscardUnsyncedChanges",
}

export type ClientResetManualConfiguration = {
  mode: ClientResetMode.Manual;
  onManual?: ClientResetFallbackCallback;
};

export type ClientResetDiscardUnsyncedChangesConfiguration = {
  mode: ClientResetMode.DiscardUnsyncedChanges;
  onAfter?: ClientResetAfterCallback;
  /**
   * Called before sync initiates a client reset.
   */
  onBefore?: ClientResetBeforeCallback;
};

export type ClientResetRecoverUnsyncedChangesConfiguration = {
  mode: ClientResetMode.RecoverUnsyncedChanges;
  onAfter?: ClientResetAfterCallback;
  /**
   * Called before sync initiates a client reset.
   */
  onBefore?: ClientResetBeforeCallback;
  /**
   * Called if recovery or discard fail.
   */
  onFallback?: ClientResetFallbackCallback;
};

export type ClientResetRecoverOrDiscardUnsyncedChangesConfiguration = {
  mode: ClientResetMode.RecoverOrDiscardUnsyncedChanges;
  onAfter?: ClientResetAfterCallback;
  /**
   * Called before sync initiates a client reset.
   */
  onBefore?: ClientResetBeforeCallback;
  /**
   * Called if recovery or discard fail.
   */
  onFallback?: ClientResetFallbackCallback;
};

export type ClientResetConfig =
  | ClientResetManualConfiguration
  | ClientResetDiscardUnsyncedChangesConfiguration
  | ClientResetRecoverUnsyncedChangesConfiguration
  | ClientResetRecoverOrDiscardUnsyncedChangesConfiguration;

export type SSLConfiguration = {
  /**
   * Whether the SSL certificates must be validated. This should generally
   * be `true` in production.
   *
   * Default is `true`.
   */
  validate?: boolean;
  /**
   * The path where to find trusted SSL certificates used to validate the
   * server certificate. If `undefined`, validation will be delegated to
   * the provided `validateCertificates` callback.
   */
  certificatePath?: string;
  /**
   * A callback function used to validate the server's SSL certificate. It
   * is invoked for every certificate in the certificate chain starting from
   * the root downward. An SSL connection will be established if all certificates
   * are accepted. The certificate will be accepted if the callback returns `true`,
   * or rejected if returning `false`. This callback is only invoked if
   * `certificatePath` is `undefined`.
   */
  validateCertificates?: SSLVerifyCallback;
};

export type SSLVerifyCallback = (sslVerifyObject: SSLVerifyObject) => boolean;

type SSLVerifyCallbackWithListArguments = (
  serverAddress: string,
  serverPort: number,
  pemCertificate: string,
  preverifyOk: number, // Acts as `SSLVerifyObject.acceptedByOpenSSL`
  depth: number,
) => boolean;

export type SSLVerifyObject = {
  /**
   * The address that the SSL connection is being established to.
   */
  serverAddress: string;
  /**
   * The port that the SSL connection is being established to.
   */
  serverPort: number;
  /**
   * The certificate using the PEM format.
   */
  pemCertificate: string;
  /**
   * The result of OpenSSL's preverification of the certificate. If `true`,
   * the certificate has been accepted and will generally be safe to trust.
   * If `false`, it has been rejected and the user should do an independent
   * validation step.
   */
  acceptedByOpenSSL: boolean;
  /**
   * The position of the certificate in the certificate chain. The actual
   * server certificate has `depth` 0 (lowest) and also contains the host
   * name, while all other certificates up the chain have higher depths in
   * increments of 1.
   */
  depth: number;
};

/**
 * This describes the different options used to create a {@link Realm} instance with Atlas App Services synchronization.
 */
export type BaseSyncConfiguration = {
  /**
   * A {@link Realm.User} object obtained by calling `Realm.App.logIn`.
   */
  user: AnyUser;
  /**
   * Whether to create a new file and sync in background or wait for the file to be synced.
   */
  newRealmFileBehavior?: OpenRealmBehaviorConfiguration;
  /**
   * Whether to open existing file and sync in background or wait for the sync of the file to complete and then open.
   * If not set, the Realm will be downloaded before opened.
   */
  existingRealmFileBehavior?: OpenRealmBehaviorConfiguration;
  /**
   * A callback function which is called in error situations.
   * The callback is passed two arguments: `session` and `syncError`.
   * If `syncError.name == "ClientReset"`, `syncError.path` and `syncError.config` are set and `syncError.readOnly` is true (deprecated, see `Realm.App.Sync~ClientResetConfiguration`).
   * Otherwise, `syncError` can have up to five properties: `name`, `message`, `isFatal`, `category`, and `code`.
   */
  onError?: ErrorCallback;
  /**
   * Custom HTTP headers, which are included when making requests to the server.
   */
  customHttpHeaders?: Record<string, string>;
  /**
   * SSL configuration.
   */
  ssl?: SSLConfiguration;
  /**
   * Configuration of Client Reset
   */
  clientReset?: ClientResetConfig;
  /**
   * Set to true, all async operations (such as opening the Realm with `Realm.open`) will fail when a non-fatal error, such as a timeout, occurs.
   */
  cancelWaitsOnNonFatalError?: boolean;
  /** @internal */
  _sessionStopPolicy?: SessionStopPolicy;
};

export type InitialSubscriptions = {
  /**
   * A callback to make changes to a SubscriptionSet.
   * @see {@link SubscriptionSet.update} for more information.
   */
  update: (mutableSubscriptions: MutableSubscriptionSet, realm: Realm) => void;
  /**
   * If `true`, the {@link InitialSubscriptions.update} callback will be rerun every time the Realm is
   * opened (e.g. every time a user opens your app), otherwise (by default) it
   * will only be run if the Realm does not yet exist.
   */
  rerunOnOpen?: boolean;
};

export type FlexibleSyncConfiguration = BaseSyncConfiguration & {
  flexible: true;
  partitionValue?: never;
  /**
   * Optional object to configure the setup of an initial set of flexible
   * sync subscriptions to be used when opening the Realm. If this is specified,
   * {@link Realm.open} will not resolve until this set of subscriptions has been
   * fully synchronized with the server.
   * @example
   * const config: Realm.Configuration = {
   *   sync: {
   *     user,
   *     flexible: true,
   *     initialSubscriptions: {
   *       update: (subs, realm) => {
   *         subs.add(realm.objects('Task'));
   *       },
   *       rerunOnOpen: true,
   *     },
   *   },
   *   // ... rest of config ...
   * };
   * const realm = await Realm.open(config);
   *
   * // At this point, the Realm will be open with the data for the initial set
   * // subscriptions fully synchronised.
   */
  initialSubscriptions?: InitialSubscriptions;
};

export type PartitionSyncConfiguration = BaseSyncConfiguration & {
  flexible?: never;
  partitionValue: PartitionValue;
  initialSubscriptions?: never;
};

export type SyncConfiguration = FlexibleSyncConfiguration | PartitionSyncConfiguration;

/** @internal */
export function toBindingSyncConfig(config: SyncConfiguration): binding.SyncConfig_Relaxed {
  const {
    user,
    flexible,
    partitionValue,
    onError,
    _sessionStopPolicy,
    customHttpHeaders,
    ssl,
    clientReset,
    cancelWaitsOnNonFatalError,
  } = config;

  return {
    user: user.internal,
    partitionValue: flexible ? undefined : EJSON.stringify(partitionValue),
    flxSyncRequested: !!flexible,
    stopPolicy: _sessionStopPolicy
      ? toBindingStopPolicy(_sessionStopPolicy)
      : binding.SyncSessionStopPolicy.AfterChangesUploaded,
    customHttpHeaders,
    clientValidateSsl: ssl?.validate,
    sslTrustCertificatePath: ssl?.certificatePath,
    sslVerifyCallback: ssl?.validateCertificates
      ? binding.Helpers.makeSslVerifyCallback(toSSLVerifyCallbackWithListArguments(ssl.validateCertificates))
      : undefined,
    ...parseClientResetConfig(clientReset, onError),
    cancelWaitsOnNonfatalError: cancelWaitsOnNonFatalError,
  };
}

/** @internal */
function toSSLVerifyCallbackWithListArguments(verifyCallback: SSLVerifyCallback): SSLVerifyCallbackWithListArguments {
  return (serverAddress: string, serverPort: number, pemCertificate: string, preverifyOk: number, depth: number) =>
    verifyCallback({ serverAddress, serverPort, pemCertificate, acceptedByOpenSSL: !!preverifyOk, depth });
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
      ? toBindingNotifyAfterClientResetWithFallback(clientReset.onAfter, clientReset.onFallback)
      : undefined,
  };
}

/** @internal */
function parseRecoverOrDiscardUnsyncedChanges(clientReset: ClientResetRecoverOrDiscardUnsyncedChangesConfiguration) {
  return {
    clientResyncMode: toBindingClientResetMode(clientReset.mode),
    notifyBeforeClientReset: clientReset.onBefore ? toBindingNotifyBeforeClientReset(clientReset.onBefore) : undefined,
    notifyAfterClientReset: clientReset.onAfter
      ? toBindingNotifyAfterClientResetWithFallback(clientReset.onAfter, clientReset.onFallback)
      : undefined,
  };
}

/**
 * Validate the fields of a user-provided realm sync configuration.
 * @internal
 */
export function validateSyncConfiguration(config: unknown): asserts config is SyncConfiguration {
  assert.object(config, "'sync' on realm configuration", { allowArrays: false });
  const {
    user,
    newRealmFileBehavior,
    existingRealmFileBehavior,
    onError,
    customHttpHeaders,
    ssl,
    clientReset,
    flexible,
    cancelWaitOnNonFatalError: cancelWaitsOnNonFatalError,
  } = config;

  assert.instanceOf(user, User, "'user' on realm sync configuration");
  if (cancelWaitsOnNonFatalError !== undefined) {
    assert.boolean(cancelWaitsOnNonFatalError, "'cancelWaitOnNonFatalError' on sync configuration");
  }
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
  if (ssl !== undefined) {
    validateSSLConfiguration(ssl);
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
 * Validate the fields of a user-provided SSL configuration.
 */
function validateSSLConfiguration(config: unknown): asserts config is SSLConfiguration {
  assert.object(config, "'ssl' on realm sync configuration");
  if (config.validate !== undefined) {
    assert.boolean(config.validate, "'ssl.validate' on realm sync configuration");
  }
  if (config.certificatePath !== undefined) {
    assert.string(config.certificatePath, "'ssl.certificatePath' on realm sync configuration");
  }
  if (config.validateCertificates !== undefined) {
    assert.function(config.validateCertificates, "'ssl.validateCertificates' on realm sync configuration");
  }
}

/**
 * Validate the fields of a user-provided client reset configuration.
 */
function validateClientResetConfiguration(config: unknown): asserts config is ClientResetConfig {
  assert.object(config, "'clientReset' on realm sync configuration", { allowArrays: false });
  const modes = Object.values(ClientResetMode);
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
  // We only allow `flexible` to be `true` (for Flexible Sync) or `undefined` (for Partition Sync).
  // `{ flexible: false }` is not allowed because TypeScript cannot discriminate that type correctly
  // with `strictNullChecks` disabled, and there is no real use case for `{ flexible: false }`.
  assert(
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
      Number.isSafeInteger(value),
      `Expected 'partitionValue' on realm sync configuration to be an integer, got ${value}.`,
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
