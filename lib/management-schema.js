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

'use strict';

module.exports = [
    {
        name: 'PermissionChange',
        properties: {
            id:            { type: 'string' },
            createdAt:     { type: 'date' },
            updatedAt:     { type: 'date' },
            statusCode:    { type: 'int', optional: true },
            statusMessage: { type: 'string', optional: true },
            userId:        { type: 'string' },
            realmUrl:      { type: 'string' },
            mayRead:       { type: 'bool', optional: true },
            mayWrite:      { type: 'bool', optional: true },
            mayManage:     { type: 'bool', optional: true },
        },
        primaryKey: 'id'
    },
    {
        name: 'PermissionOffer',
        properties: {
            id:            { type: 'string' },
            createdAt:     { type: 'date' },
            updatedAt:     { type: 'date' },
            statusCode:    { type: 'int', optional: true },
            statusMessage: { type: 'string', optional: true },
            token:         { type: 'string', optional: true, indexed: true },
            realmUrl:      { type: 'string' },
            mayRead:       { type: 'bool', default: false },
            mayWrite:      { type: 'bool', default: false },
            mayManage:     { type: 'bool', default: false },
            expiresAt:     { type: 'date', optional: true },
        },
        primaryKey: 'id'
    },
    {
        name: 'PermissionOfferResponse',
        properties: {
            id:            { type: 'string' },
            createdAt:     { type: 'date' },
            updatedAt:     { type: 'date' },
            statusCode:    { type: 'int', optional: true },
            statusMessage: { type: 'string', optional: true },
            token:         { type: 'string' },
            realmUrl:      { type: 'string', optional: true },
        },
        primaryKey: 'id'
    }
];
