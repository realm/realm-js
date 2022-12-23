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
import { User, assert, toBindingClientResetMode, toBindingErrorHandler, toBindingStopPolicy, toBindingNotifyBeforeClientReset, toBindingNotifyAfterClientReset, toBindingNotifyAfterClientResetWithfallback, toBindingErrorHandlerWithOnManual, } from "../internal";
export var OpenRealmBehaviorType;
(function (OpenRealmBehaviorType) {
    OpenRealmBehaviorType["DownloadBeforeOpen"] = "downloadBeforeOpen";
    OpenRealmBehaviorType["OpenImmediately"] = "openImmediately";
})(OpenRealmBehaviorType || (OpenRealmBehaviorType = {}));
export var OpenRealmTimeOutBehavior;
(function (OpenRealmTimeOutBehavior) {
    OpenRealmTimeOutBehavior["OpenLocalRealm"] = "openLocalRealm";
    OpenRealmTimeOutBehavior["ThrowException"] = "throwException";
})(OpenRealmTimeOutBehavior || (OpenRealmTimeOutBehavior = {}));
export var SessionStopPolicy;
(function (SessionStopPolicy) {
    SessionStopPolicy["AfterUpload"] = "after-upload";
    SessionStopPolicy["Immediately"] = "immediately";
    SessionStopPolicy["Never"] = "never";
})(SessionStopPolicy || (SessionStopPolicy = {}));
export var ClientResetMode;
(function (ClientResetMode) {
    ClientResetMode["Manual"] = "manual";
    ClientResetMode["DiscardUnsyncedChanges"] = "discardUnsyncedChanges";
    ClientResetMode["RecoverUnsyncedChanges"] = "recoverUnsyncedChanges";
    ClientResetMode["RecoverOrDiscardUnsyncedChanges"] = "recoverOrDiscardUnsyncedChanges";
})(ClientResetMode || (ClientResetMode = {}));
/** @internal */
export function toBindingSyncConfig(config) {
    if (config.flexible) {
        throw new Error("Flexible sync has not been implemented yet");
    }
    const { user, onError, _sessionStopPolicy, customHttpHeaders, clientReset } = config;
    assert.instanceOf(user, User, "user");
    validatePartitionValue(config.partitionValue);
    const partitionValue = EJSON.stringify(config.partitionValue);
    return {
        user: config.user.internal,
        partitionValue,
        stopPolicy: _sessionStopPolicy
            ? toBindingStopPolicy(_sessionStopPolicy)
            : 2 /* binding.SyncSessionStopPolicy.AfterChangesUploaded */,
        customHttpHeaders: customHttpHeaders,
        ...parseClientResetConfig(clientReset, onError),
    };
}
/** @internal */
function parseClientResetConfig(clientReset, onError) {
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
            return parseManual(clientReset, onError);
        }
        case ClientResetMode.DiscardUnsyncedChanges: {
            return {
                ...parseDiscardUnsyncedChanges(clientReset),
                errorHandler: onError ? toBindingErrorHandler(onError) : undefined,
            };
        }
        case ClientResetMode.RecoverUnsyncedChanges: {
            return {
                ...parseRecoverUnsyncedChanges(clientReset),
                errorHandler: onError ? toBindingErrorHandler(onError) : undefined,
            };
        }
        case ClientResetMode.RecoverOrDiscardUnsyncedChanges: {
            return {
                ...parseRecoverOrDiscardUnsyncedChanges(clientReset),
                errorHandler: onError ? toBindingErrorHandler(onError) : undefined,
            };
        }
    }
}
/** @internal */
function parseManual(clientReset, onError) {
    return {
        clientResyncMode: toBindingClientResetMode(clientReset.mode),
        errorHandler: toBindingErrorHandlerWithOnManual(onError, clientReset.onManual),
    };
}
/** @internal */
function parseDiscardUnsyncedChanges(clientReset) {
    return {
        clientResyncMode: toBindingClientResetMode(clientReset.mode),
        notifyBeforeClientReset: clientReset.onBefore ? toBindingNotifyBeforeClientReset(clientReset.onBefore) : undefined,
        notifyAfterClientReset: clientReset.onAfter ? toBindingNotifyAfterClientReset(clientReset.onAfter) : undefined,
    };
}
/** @internal */
function parseRecoverUnsyncedChanges(clientReset) {
    return {
        clientResyncMode: toBindingClientResetMode(clientReset.mode),
        notifyBeforeClientReset: clientReset.onBefore ? toBindingNotifyBeforeClientReset(clientReset.onBefore) : undefined,
        notifyAfterClientReset: clientReset.onAfter
            ? toBindingNotifyAfterClientResetWithfallback(clientReset.onAfter, clientReset.onFallback)
            : undefined,
    };
}
/** @internal */
function parseRecoverOrDiscardUnsyncedChanges(clientReset) {
    return {
        clientResyncMode: toBindingClientResetMode(clientReset.mode),
        notifyBeforeClientReset: clientReset.onBefore ? toBindingNotifyBeforeClientReset(clientReset.onBefore) : undefined,
        notifyAfterClientReset: clientReset.onAfter
            ? toBindingNotifyAfterClientResetWithfallback(clientReset.onAfter, clientReset.onFallback)
            : undefined,
    };
}
/** @internal */
function validatePartitionValue(pv) {
    if (typeof pv === "number") {
        validateNumberValue(pv);
        return;
    }
    if (!(pv instanceof ObjectId || pv instanceof UUID || typeof pv === "string" || pv === null)) {
        throw new Error(pv + " is not an allowed PartitionValue");
    }
}
/** @internal */
function validateNumberValue(numberValue) {
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
//# sourceMappingURL=SyncConfiguration.js.map