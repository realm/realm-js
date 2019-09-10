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

const accessLevels = ['none', 'read', 'write', 'admin'];
const offerAccessLevels = ['read', 'write', 'admin'];

module.exports = {
  getGrantedPermissions(recipient) {
    if (recipient && ['currentUser', 'otherUser', 'any'].indexOf(recipient) === -1) {
      return Promise.reject(new Error(`'${recipient}' is not a valid recipient type. Must be 'any', 'currentUser' or 'otherUser'.`));
    }

    const options = {
      method: 'GET',
      headers: { Authorization: this.token },
    };

    return this._performFetch(`permissions?recipient=${recipient}`, options)
      .then((response) => {
        const permissions = response.permissions;

        // this is for backward compatibility
        for (const permission of permissions) {
          permission.mayRead = permission.accessLevel === 'read' || permission.accessLevel === 'write' || permission.accessLevel === 'admin';
          permission.mayWrite = permission.accessLevel === 'write' || permission.accessLevel === 'admin';
          permission.mayManage = permission.accessLevel === 'admin';
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

    const options = {
      method: 'POST',
      headers: { Authorization: this.token },
      body: {
        condition,
        realmPath: realmUrl,
        accessLevel: accessLevel.toLowerCase(),
      },
    };

    return this._performFetch('permissions/apply', options);
  },

  offerPermissions(realmUrl, accessLevel, expiresAt) {
    if (!realmUrl) {
      return Promise.reject(new Error('realmUrl must be specified'));
    }

    if (offerAccessLevels.indexOf(accessLevel) === -1) {
      return Promise.reject(new Error(`'${accessLevel}' is not a valid access level. Must be ${offerAccessLevels.join(', ')}.`));
    }

    const options = {
      method: 'POST',
      headers: { Authorization: this.token },
      body: {
        expiresAt,
        realmPath: realmUrl,
        accessLevel: accessLevel.toLowerCase(),
      },
    };

    return this._performFetch('permissions/offers', options)
      .then((result) => {
        return result.token;
      });
  },

  acceptPermissionOffer(token) {
    if (!token) {
      return Promise.reject(new Error('Offer token must be specified'));
    }

    const options = {
      method: 'POST',
      headers: { Authorization: this.token },
    };

    return this._performFetch(`permissions/offers/${token}/accept`, options)
      .then((result) => {
        return result.path;
      });
  },

  invalidatePermissionOffer(permissionOfferOrToken) {
    const options = {
      method: 'DELETE',
      headers: { Authorization: this.token },
    };

    let token = typeof permissionOfferOrToken === 'string' ? permissionOfferOrToken : permissionOfferOrToken.token;
    return this._performFetch(`permissions/offers/${token}`, options)
      .then((result) => {
        return result.path;
      });
  },

  getPermissionOffers() {
    const options = {
      method: 'GET',
      headers: { Authorization: this.token },
    };

    return this._performFetch(`permissions/offers`, options)
      .then((result) => {
        return result.offers;
      });
  }
}
