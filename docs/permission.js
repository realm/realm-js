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

/* eslint getter-return: "off" */

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
 * @memberof Realm.Sync.User
 */
class PermissionChange {

    /**
     * Gets the unique identifier of this object in the Management realm.
     * @type {string}
     */
    get id() { }

    /**
     * Gets the creation time of this object.
     * @type {Date}
     */
    get createdAt() { }

    /**
     * Gets when the object was updated the last time.
     * @type {Date}
     */
    get updatedAt() { }

    /**
     *
     */
    get statusCode() { }

    /**
     * A detailed message describing the status (success, error) of the operation. null if the object
     * has not been processed yet.
     * Filled by the server after an object was processed with additional info
     * explaining the status if necessary.
     */
    get statusMessage() { }

    /**
     * The identifier of the user who will have changed permissions
     * @type {string}
     */
    get userId() { }

    /**
     * The URL for the Realm that the changes should apply to.
     * @type {string}
     */
    get realmUrl() { }

    /**
     * Should the user be allowed to read from the Realm?
     * @type {bool}
     */
    get mayRead() { }

    /**
     * Should the user be allowed to write to the Realm?
     * @type {bool}
     */
    get mayWrite() { }

    /**
     * Should the user be allowed to manage the Realm?
     * @type {bool}
     */
    get mayManage() { }
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
 * @memberof Realm.Sync.User
 */
class PermissionOffer {
    /**
     * Gets the unique identifier of this object in the Management realm.
     * @type {string}
     */
    get id() { }

    /**
     * Gets the creation time of this object.
     * @type {Date}
     */
    get createdAt() { }

    /**
     * Gets when the object was updated the last time.
     * @type {Date}
     */
    get updatedAt() { }

    /**
     *
     */
    get statusCode() { }

    /**
     * A detailed message describing the status (success, error) of the operation. null if the object
     * has not been processed yet.
     * Filled by the server after an object was processed with additional info
     * explaining the status if necessary.
     */
    get statusMessage() { }

    /**
     * Gets the token that can be used to offer the permissions defined in this object to another user.
     * @type {string}
     */
    get token() { }

    /**
     * The URL for the Realm that the changes should apply to.
     * @type {string}
     */
    get realmUrl() { }

    /**
     * Should the user be allowed to read from the Realm?
     * @type {bool}
     */
    get mayRead() { }

    /**
     * Should the user be allowed to write to the Realm?
     * @type {bool}
     */
    get mayWrite() { }

    /**
     * Should the user be allowed to manage the Realm?
     * @type {bool}
     */
    get mayManage() { }

    /**
     * Gets or sets the expiration date and time of the offer.
     * If null, the offer will never expire. Otherwise, the offer may not be consumed past the expiration date.
     * @type {Date}
     */
    get expiresAt() { }
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
 * @memberof Realm.Sync.User
 */
class PermissionOfferResponse {
    /**
     * Gets the unique identifier of this object in the Management realm.
     * @type {string}
     */
    get id() { }

    /**
     * Gets the creation time of this object.
     * @type {Date}
     */
    get createdAt() { }

    /**
     * Gets when the object was updated the last time.
     * @type {Date}
     */
    get updatedAt() { }

    /**
     *
     */
    get statusCode() { }

    /**
     * A detailed message describing the status (success, error) of the operation. null if the object
     * has not been processed yet.
     * Filled by the server after an object was processed with additional info
     * explaining the status if necessary.
     */
    get statusMessage() { }

    /**
     * Gets the token that can be used to offer the permissions defined in this object to another user.
     * @type {string}
     */
    get token() { }

    /**
     * The URL for the Realm that the changes should apply to.
     * @type {string}
     */
    get realmUrl() { }
}



/**
 * A permission which can be applied to a Realm, Class, or specific Object.
 * Permissions are applied by adding the permission to the Realm.Permission singleton
 * object, the RealmClass.Permission object for the desired class, or to a user-defined
 * Realm.List<Realm.Permission> property on a specific Object instance. The meaning of each of
 * the properties of Permission depend on what the permission is applied to, and so are
 * left undocumented here.
 * @since 2.3.0
 * @memberof Realm.Permissions
 */
class Permission {

    /**
     * The Role which this Permission applies to. All users within the Role are
     * granted the permissions specified by the fields below any
     * objects/classes/realms which use this Permission.
     *
     * This property cannot be modified once set.
     * @type {Realm.Permissions.Role}
     */
    get role() { }

    /**
     * Whether the user can read the object to which this Permission is attached.
     * @type {boolean}
     */
    get canRead() { }

    /**
     * Whether the user can modify the object to which this Permission is attached.
     * @type {boolean}
     */
    get canUpdate() { }

    /**
     * Whether the user can delete the object to which this Permission is attached.
     *
     * This property is only applicable to Permissions attached to Objects, and not
     * to Realms or Classes.
     * @type {boolean}
     */
    get canDelete() { }

    /**
     * Whether the user can add or modify Permissions for the object which this
     * Permission is attached to.
     * @type {boolean}
     */
    get canSetPermissions() { }

    /**
     *  Whether the user can subscribe to queries for this object type.
     *
     * This property is only applicable to Permissions attached to Classes, and not
     * to Realms or Objects.
     * @type {boolean}
     */
    get canQuery() { }

    /**
     * Whether the user can create new objects of the type this Permission is attached to.
     *
     * This property is only applicable to Permissions attached to Classes, and not
     * to Realms or Objects.
     * @type {boolean}
     */
    get canCreate() { }

    /**
     * Whether the user can modify the schema of the Realm which this
     * Permission is attached to.
     *
     * This property is only applicable to Permissions attached to Realms, and not
     * to Realms or Objects.
     * @type {boolean}
     */
    get canModifySchema() { }
}

/**
 * A representation of a sync user within the permissions system.
 *
 * User objects are created automatically for each sync user which connects to
 * a Realm, and can also be created manually if you wish to grant permissions to a user
 * which has not yet connected to this Realm.
 * @since 2.3.0
 * @memberof Realm.Permissions
 */
class User {
    /**
     * The unique Realm Object Server user ID string identifying this user. This will have
     * the same value as Realm.Sync.User.identity.
     * @type {string}
     */
    get id() { }
}

/**
 * A Role within the permissions system.
 *
 * A Role consists of a name for the role and a list of users which are members of the role.
 * Roles are granted privileges on Realms, Classes and Objects, and in turn grant those
 * privileges to all users which are members of the role.
 * A role named "everyone" is automatically created in new Realms, and all new users which
 * connect to the Realm are automatically added to it. Any other roles you wish to use are
 * managed as normal Realm objects.
 * @since 2.3.0
 * @memberof Realm.Permissions
 */
class Role {
    /**
     * The name of the Role.
     * @type {string}
     */
    get name() { }

    /**
     * The users which belong to the role.
     * @type {Array<Realm.Permissions.User>}
     */
    get members() { }
}

/**
 * An object which describes class-wide permissions.
 *
 * An instance of this object is automatically created in the Realm for class in your schema,
 * and should not be created manually.
 * @since 2.3.0
 * @memberof Realm.Permissions
 */
class Class {
    /**
     * The name of the class which these permissions apply to.
     * @type {string}
     * @deprecated Use name() instead.
     */
    get class_name() { }

    /**
     * The name of the class which these permissions apply to.
     * @type {string}
     * @since 2.18.0
     */
    get name() { }

    /**
     * The permissions for this class.
     * @type {Array<Realm.Permissions.Permission>}
     */
    get permissions() { }

    /**
     * Finds the Class-level permissions associated with the named Role. If either the role or the permission
     * object doesn't exist, it will be created.
     *
     * If the Permission object is created because one didn't exist already, it will be
     * created with all privileges disabled.
     *
     * If the Role object is created because one didn't exist, it will be created
     * with no members.
     *
     * @type {Realm.Permissions.Permission}
     * @since 2.18.0
     */
    findOrCreate(roleName) { }
}

/**
 *  A singleton object which describes Realm-wide permissions.
 *
 * An object of this type is automatically created in the Realm for you, and more objects
 * cannot be created manually.
 * @since 2.3.0
 * @memberof Realm.Permissions
 */
class Realm {

    /**
     * The permissions for the Realm.
     * @type {Array<Realm.Permissions.Permission>}
     */
    get permissions() { }

    /**
     * Finds the Realm-level permissions associated with the named Role. If either the role or the permission
     * object doesn't exist, it will be created.
     *
     * If the Permission object is created because one didn't exist already, it will be
     * created with all privileges disabled.
     *
     * If the Role object is created because one didn't exist, it will be created
     * with no members.
     *
     * @type {Realm.Permissions.Permission}
     * @since 2.17.0
     */
    findOrCreate(roleName) { }
}
