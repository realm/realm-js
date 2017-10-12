////////////////////////////////////////////////////////////////////////////
//
// Copyright 2017 Realm Inc.
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

'use strict';

const url_parse = require('url-parse');
const managementSchema = require('./management-schema');

function generateUniqueId() {
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  return uuid;
}

const permissionSchema = [{
    name: 'Permission',
    properties: {
        userId: {type: 'string' },
        path: { type: 'string' },
        mayRead: { type: 'bool', optional: false },
        mayWrite: { type: 'bool', optional: false },
        mayManage: { type: 'bool', optional: false },
        updatedAt: { type: 'date', optional: false },
    }
}];

// Symbols are not supported on RN yet, so we use this for now:
const specialPurposeRealmsKey = '_specialPurposeRealms';

function getSpecialPurposeRealm(user, realmName, schema) {
  if (!user.hasOwnProperty(specialPurposeRealmsKey)) {
    user[specialPurposeRealmsKey] = {};
  }

  if (user[specialPurposeRealmsKey].hasOwnProperty(realmName)) {
    return Promise.resolve(user[specialPurposeRealmsKey][realmName]);
  }

  const url = url_parse(user.server);
  if (url.protocol === 'http:') {
    url.set('protocol', 'realm:');
  } else if (url.protocol === 'https:') {
    url.set('protocol', 'realms:');
  } else {
    throw new Error(`Unexpected user auth url: ${user.server}`);
  }

  url.set('pathname', `/~/${realmName}`);

  const config = {
    schema: schema,
    sync: {
      user,
      url: url.href
    }
  };

  let Realm = user.constructor._realmConstructor;
  return Realm.open(config).then(realm => {
    user[specialPurposeRealmsKey][realmName] = realm;
    return realm;
  })
}

function createInManagementRealm(user, modelName, modelInitializer) {
  return getSpecialPurposeRealm(user, '__management', managementSchema)
    .then(managementRealm => {
      return new Promise((resolve, reject) => {
        try {
          let o;

          const listener = () => {
            if (!o) {
              return;
            }

            const statusCode = o.statusCode;
            if (typeof statusCode === 'number') {
              managementRealm.removeListener('change', listener);

              if (statusCode === 0) {
                setTimeout(() => resolve(o), 1);
              }
              else {
                const e = new Error(o.statusMessage);
                e.statusCode = statusCode;
                e.managementObject = o;
                setTimeout(() => reject(e), 1);
              }
            }
          }

          managementRealm.addListener('change', listener);

          managementRealm.write(() => {
            o = managementRealm.create(modelName, modelInitializer);
          });
        }
        catch (e) {
          reject(e);
        }
      });
    });
}

const accessLevels = ['none', 'read', 'write', 'admin'];
const offerAccessLevels = ['read', 'write', 'admin'];

module.exports = {
  getGrantedPermissions(recipient) {
    if (recipient && ['currentUser', 'otherUser', 'any'].indexOf(recipient) === -1) {
      return Promise.reject(new Error(`'${recipient}' is not a valid recipient type. Must be 'any', 'currentUser' or 'otherUser'.`));
    }

    return getSpecialPurposeRealm(this, '__permission', permissionSchema)
      .then(permissionRealm => {
          let permissions = permissionRealm.objects('Permission')
            .filtered('NOT path ENDSWITH "__permission" AND NOT path ENDSWITH "__management"');

          if (recipient === 'currentUser') {
              permissions = permissions.filtered('userId = $0', this.identity);
          }
          else if (recipient === 'otherUser') {
              permissions = permissions.filtered('userId != $0', this.identity);
          }
          return permissions;
      });
  },

  applyPermissions(condition, realmUrl, accessLevel) {
    if (!realmUrl) {
      return Promise.reject(new Error('realmUrl must be specified'));
    }

    if (accessLevels.indexOf(accessLevel) === -1) {
      return Promise.reject(new Error(`'${accessLevel}' is not a valid access level. Must be ${accessLevels.join(', ')}.`));
    }

    const mayRead = accessLevel === 'read' || accessLevel === 'write' || accessLevel === 'admin';
    const mayWrite = accessLevel === 'write' || accessLevel === 'admin';
    const mayManage = accessLevel === 'admin';

    const permissionChange = {
      id: generateUniqueId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      realmUrl,
      mayRead,
      mayWrite,
      mayManage
    };

    if (condition.hasOwnProperty('userId')) {
      permissionChange.userId = condition.userId;
    }
    else {
      permissionChange.userId = '';
      permissionChange.metadataKey = condition.metadataKey;
      permissionChange.metadataValue = condition.metadataValue;
    }

    return createInManagementRealm(this, 'PermissionChange', permissionChange);
  },

  offerPermissions(realmUrl, accessLevel, expiresAt) {
    if (!realmUrl) {
      return Promise.reject(new Error('realmUrl must be specified'));
    }

    if (offerAccessLevels.indexOf(accessLevel) === -1) {
      return Promise.reject(new Error(`'${accessLevel}' is not a valid access level. Must be ${offerAccessLevels.join(', ')}.`));
    }

    const mayRead = true;
    const mayWrite = accessLevel === 'write' || accessLevel === 'admin';
    const mayManage = accessLevel === 'admin';

    const permissionOffer = {
      id: generateUniqueId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt,
      realmUrl,
      mayRead,
      mayWrite,
      mayManage
    };

    return createInManagementRealm(this, 'PermissionOffer', permissionOffer)
      .then(appliedOffer => appliedOffer.token);
  },

  acceptPermissionOffer(token) {
    if (!token) {
      return Promise.reject(new Error('Offer token must be specified'));
    }

    const permissionOfferResponse = {
      id: generateUniqueId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      token
    };

    return createInManagementRealm(this, 'PermissionOfferResponse', permissionOfferResponse)
      .then(appliedReponse => appliedReponse.realmUrl);
  },

  invalidatePermissionOffer(permissionOfferOrToken) {
    return getSpecialPurposeRealm(this, '__management', managementSchema)
      .then(managementRealm => {
        let permissionOffer;

        if (typeof permissionOfferOrToken === 'string') {
          // We were given a token, not an object. Find the matching object.
          const q = managementRealm.objects('PermissionOffer')
            .filtered('token = $0', permissionOfferOrToken);

          if (q.length === 0) {
            throw new Error("No permission offers with the given token were found");
          }

          permissionOffer = q[0];
        }
        else {
          permissionOffer = permissionOfferOrToken;
        }

        managementRealm.write(() => {
          permissionOffer.expiresAt = new Date();
        });
      });
  }
}
