////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

import { ObjectId } from "bson";
import { Base64 } from "js-base64";

import { getEnvironment } from "./environment";
import { Storage } from "./storage";
import { removeKeysWithUndefinedValues } from "./utils/objects";

/**
 * The key in a storage on which the device id is stored.
 */
export const DEVICE_ID_STORAGE_KEY = "deviceId";

/** Provided by Rollup */
declare const __SDK_VERSION__: string;

enum DeviceFields {
    DEVICE_ID = "deviceId",
    APP_ID = "appId",
    APP_VERSION = "appVersion",
    PLATFORM = "platform",
    PLATFORM_VERSION = "platformVersion",
    SDK_VERSION = "sdkVersion",
}

type DeviceInformationValues = {
    [DeviceFields.PLATFORM]: string;
    [DeviceFields.PLATFORM_VERSION]: string;
    [DeviceFields.SDK_VERSION]: string;
    [DeviceFields.APP_ID]?: string;
    [DeviceFields.APP_VERSION]?: string;
    [DeviceFields.DEVICE_ID]?: ObjectId;
};

type DeviceInformationParams = {
    appId?: string;
    appVersion?: string;
    storage: Storage;
};

/**
 * Information describing the device, app and SDK.
 */
export class DeviceInformation implements DeviceInformationValues {
    /**
     * The id of the device.
     */
    public readonly deviceId: ObjectId | undefined;

    /**
     * The id of the Realm App.
     */
    public readonly appId: string | undefined;

    /**
     * The version of the Realm App.
     */
    public readonly appVersion: string | undefined;

    /**
     * The name of the platform / browser.
     */
    public readonly platform: string;

    /**
     * The version of the platform / browser.
     */
    public readonly platformVersion: string;

    /**
     * The version of the Realm Web SDK (constant provided by Rollup).
     */
    public readonly sdkVersion: string = __SDK_VERSION__;

    /**
     * @param params Construct the device information from these parameters.
     */
    public constructor({
        appId,
        appVersion,
        storage,
    }: DeviceInformationParams) {
        const environment = getEnvironment();
        this.platform = environment.platform;
        this.platformVersion = environment.platformVersion;
        this.appId = appId;
        this.appVersion = appVersion;
        const storedDeviceId = storage.get(DEVICE_ID_STORAGE_KEY);
        this.deviceId =
            typeof storedDeviceId === "string"
                ? new ObjectId(storedDeviceId)
                : undefined;
    }

    /**
     * @returns An base64 URI encoded representation of the device information.
     */
    public encode(): string {
        const obj = removeKeysWithUndefinedValues(this);
        return Base64.encode(JSON.stringify(obj));
    }
}
