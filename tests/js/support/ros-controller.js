'use strict';

const Realm = require('../../..');
const fs = require('fs');
const http = require('http');
const path = require('path');
const tmp = require('tmp');

function waitForUpload(realm) {
    return realm.syncSession.uploadAllLocalChanges().then(() => { return realm; });
}

const rosDataDir = process.env.ROS_DATA_DIR || '../realm-object-server-data';
global.RosController = module.exports = class RosController {
    constructor() {
        this.httpPort = 9080;
        this.adminToken = JSON.parse(fs.readFileSync(`${rosDataDir}/keys/admin.json`, 'utf8'))['ADMIN_TOKEN'];
        this.adminUser = Realm.Sync.User.login(`http://127.0.0.1:${this.httpPort}`,
                                               Realm.Sync.Credentials.login(this.adminToken));
        this._temp = tmp.dirSync({ unsafeCleanup: true});
    }

    start() {
        return Realm.open({
            path: path.join(this._temp.name, 'admin.realm'),
            sync: {
                user: this.adminUser,
                url: `realm://127.0.0.1:${this.httpPort}/__admin`
            }
        }).then(realm => {
            this.adminRealm = realm;
        });
    }

    shutdown() {
        return waitForUpload(this.adminRealm).then(realm => {
            realm.close();
            this._temp.removeCallback();
        });
    }

    createRealm(serverPath, schema, localPath) {
        return Realm.open({
            path: localPath,
            schema: schema,
            sync: {
                user: this.adminUser,
                url: `realm://127.0.0.1:${this.httpPort}/${this.pathPrefix}/${serverPath}`
            }
        }).then(r => waitForUpload(r));
    }

    deleteRealm(serverPath) {
        const request = http.request({
            host: '127.0.0.1',
            port: this.httpPort,
            path: `/api/realm/${this.pathPrefix}/${serverPath}`,
            method: 'DELETE',
            headers: {
                'Authorization': `Realm-Access-Token version=1 token="${this.adminToken}"`
            }
        });
        return new Promise((r, e) => {
            request.on('response', r);
            request.on('error', e);
            request.end();
        });
    }

    setRealmPathPrefix(prefix) {
        this.pathPrefix = prefix;
    }
};
