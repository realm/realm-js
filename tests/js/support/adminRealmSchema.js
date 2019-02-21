'use strict';

module.exports = [
    {
        name: 'RealmFile',
        primaryKey: 'path',
        properties: {
            path: 'string',
            user: 'User'
        }
    },
    {
        name: 'User',
        primaryKey: 'id',
        properties: {
            id: 'string',
            accounts: { type: 'list', objectType: 'Account' },
            isAdmin: 'bool'
        }
    },
    {
        name: 'Account',
        properties: {
            provider: 'string',
            provider_id: 'string',
            data: { type: 'string', optional: true },
            tokens: { type: 'list', objectType: 'Token' },
            user: 'User'
        }
    },
    {
        name: 'Token',
        primaryKey: 'token',
        properties: {
            token: 'string',
            expires: 'date',
            revoked: { type: 'date', optional: true },
            files: { type: 'list', objectType: 'RealmFile' },
            account: 'Account',
            app_id: 'string'
        }
    }
];
