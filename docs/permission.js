////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

/**
 * Objects of this class allow to change permissions of owned Realms.
 * They are created exclusively by the client and are processed by the server
 * as indicated by the status fields.
 * PermissionChange objects allow to grant and revoke permissions by setting
 * mayRead, mayWrite and mayManage accordingly. 
 * If any of these flags are not set, these are merged
 * with either the existing or default permissions as applicable. As a
 * side-effect this causes that the default permissions are permanently
 * materialized for the affected Realm files and the affected user.
 * Once the request has been processed, the Status, StatusMessage, and
 * ErrorCode will be updated accordingly.
 */
class PermissionChange {

    /**
     * Gets the unique identifier of this object in the Management realm.
     * @type {string}
     */
    get id() {}

    /**
     * Gets the creation time of this object.
     * @type {Date} 
     */
    get createdAt() {}

    /**
     * Gets when the object was updated the last time.
     * @type {Date} 
     */
    get updatedAt() {}

    /**
     * 
     */
    get statusCode() {}

    /**
     * A detailed message describing the status (success, error) of the operation. null if the object
     * has not been processed yet.
     * Filled by the server after an object was processed with additional info
     * explaining the status if necessary.
     */
    get statusMessage() {}

    /**
     * The identifier of the user who will have changed permissions
     * @type {string}
     */
    get userId() {}

    /**
     * The URL for the Realm that the changes should apply to.
     * @type {string}
     */
    get realmUrl() {}

    /**
     * Should the user be allowed to read from the Realm?
     * @type {bool}
     */
    get mayRead() {}

    /**
     * Should the user be allowed to write to the Realm?
     * @type {bool}
     */
    get mayWrite() {}

    /**
     * Should the user be allowed to manage the Realm?
     * @type {bool}
     */
    get mayManage() {}
}

/**
 * Objects of this class are used to offer permissions to owned Realms.
 * They are created exclusively by the client and are processed by the server
 * as indicated by the status fields.
 * When offering permissions, you should create the offer and add it to the User's Management Realm.
 * Once the request has been processed, the statusCode, statusMessage, and
 * ErrorCode will be updated accordingly.
 * If the request has been processed successfully, the token will be populated and you can share it
 * with users you wish to grant permissions to.
 * If the request has failed, statusMessage will be updated with relevant information about the
 * failure and statusCode will be set.
 */
class PermissionOffer {
    /**
     * Gets the unique identifier of this object in the Management realm.
     * @type {string}
     */
    get id() {}

    /**
     * Gets the creation time of this object.
     * @type {Date} 
     */
    get createdAt() {}

    /**
     * Gets when the object was updated the last time.
     * @type {Date} 
     */
    get updatedAt() {}

    /**
     * 
     */
    get statusCode() {}

    /**
     * A detailed message describing the status (success, error) of the operation. null if the object
     * has not been processed yet.
     * Filled by the server after an object was processed with additional info
     * explaining the status if necessary.
     */
    get statusMessage() {}

    /**
     * Gets the token that can be used to offer the permissions defined in this object to another user.
     * @type {string}
     */
    get token() {}

    /**
     * The URL for the Realm that the changes should apply to.
     * @type {string}
     */
    get realmUrl() {}

    /**
     * Should the user be allowed to read from the Realm?
     * @type {bool}
     */
    get mayRead() {}

    /**
     * Should the user be allowed to write to the Realm?
     * @type {bool}
     */
    get mayWrite() {}

    /**
     * Should the user be allowed to manage the Realm?
     * @type {bool}
     */
    get mayManage() {}

    /**
     * Gets or sets the expiration date and time of the offer.
     * If null, the offer will never expire. Otherwise, the offer may not be consumed past the expiration date.
     * @type {Date}
     */
    get expiresAt() {}
}

/**
 * Objects of this class are used to accept a PermissionOffer using a provided token.
 * Create an instance of PermissionOfferResponse using the provided PermissionOffer.token
 * and add it to the user's ManagementRealm.
 * Once the request has been processed, the statusCode and statusMessage will be updated accordingly.
 * If the request has been processed successfully, the realmUrl will be populated and you can use it
 * to connect to the Realm.
 * If the request has failed, the statusMessage will be updated with relevant information about the
 * failure and statusCode will be set.
 */
class PermissionOfferResponse {
    /**
     * Gets the unique identifier of this object in the Management realm.
     * @type {string}
     */
    get id() {}

    /**
     * Gets the creation time of this object.
     * @type {Date} 
     */
    get createdAt() {}

    /**
     * Gets when the object was updated the last time.
     * @type {Date} 
     */
    get updatedAt() {}

    /**
     * 
     */
    get statusCode() {}

    /**
     * A detailed message describing the status (success, error) of the operation. null if the object
     * has not been processed yet.
     * Filled by the server after an object was processed with additional info
     * explaining the status if necessary.
     */
    get statusMessage() {}

    /**
     * Gets the token that can be used to offer the permissions defined in this object to another user.
     * @type {string}
     */
    get token() {}

    /**
     * The URL for the Realm that the changes should apply to.
     * @type {string}
     */
    get realmUrl() {}
}
