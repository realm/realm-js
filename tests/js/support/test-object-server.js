'use strict';

const EventEmitter = require('events').EventEmitter;
const NodeRSA = require('node-rsa');
const Realm = require('../../..');
const adminRealmSchema = require('./adminRealmSchema');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const httpProxy = require('http-proxy');
const mkdirp = require("mkdirp");
const path = require('path');
const tmp = require('tmp');

const syncLevels = [
    'all', 'trace', 'debug', 'detail', 'info', 'warn', 'error', 'fatal', 'off',
];

const token = {
    identity: '__auth',
    expires:  null,
    app_id:   'io.realm.TestObjectServer',
    access:   ['download', 'upload'],
};

function deleteFolderRecursive(path) {
  if(fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function(file, index){
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}

function waitForUpload(realm) {
    return realm.syncSession.uploadAllLocalChanges().then(() => { return realm; });
}

class SyncServerProxy {
    constructor(listenPort, targetPort) {
        this.proxy = httpProxy.createProxyServer({
            target: `http://127.0.0.1:${targetPort}`,
            ws: true
        });
        this.server = http.createServer((req, res) => {
            // Implement just enough of the directory services endpoint for the tests
            const prefix = '/realms/files/';
            const index = req.url.indexOf(prefix);
            if (index != -1) {
                const path = decodeURIComponent(req.url.slice(index + prefix.length));
                this.register(path);
                res.end(`{"syncLabel": "default", "path": "${path}"}`);
            }
            else {
                this.proxy.web(req, res);
            }
        });
        this.server.on('upgrade', (req, socket, head) => {
            if (req.url.startsWith('/realm-sync/')) {
                this.register(decodeURIComponent(req.url.slice('/realm-sync/'.length)))
            }
            this.proxy.ws(req, socket, head);
        });
        this.proxy.on('error', (err, req) => {
            if (!this.stopping) {
                console.error('SyncServerProxy:', err);
                throw err;
            }
        });
        this.server.listen(listenPort);
    }

    stop() {
        this.stopping = true;
        this.server.close();
        this.proxy.close();
    }

    register(serverPath) {
        if (serverPath === '/__admin' || !this.adminRealm || this.stopping) {
            return;
        }
        if (this.adminRealm.objects('RealmFile').filtered('path = $0', serverPath).length != 0) {
            return;
        }
        this.adminRealm.write(() => this.adminRealm.create('RealmFile', {
            id: crypto.randomBytes(16).toString('hex'),
            path: serverPath
        }));
    }
}

global.TestObjectServer = module.exports = class TestObjectServer extends EventEmitter {
    constructor() {
        super();
        const SyncServer = require('realm-sync-server').RealmSyncServer;
        Realm.Sync.setLogLevel('error');

        this._key = new NodeRSA({b: 2048});
        this.adminToken = signAdminToken(this._key, token);
        this.httpPort = 9090;
        this.adminUser = Realm.Sync.User.login(`http://127.0.0.1:${this.httpPort}`,
                                               Realm.Sync.Credentials.adminToken(this.adminToken));

        this._temp = tmp.dirSync({ unsafeCleanup: true});
        fs.writeFileSync(path.join(this._temp.name, 'public.pem'), this._key.exportKey('public'));
        this._writeConfiguration();

        this._server = new SyncServer({dataPath: this._temp.name,
                                       publicKeyPath: path.join(this._temp.name, 'public.pem'),
                                       listenAddress: '127.0.0.1',
                                       listenPort: `${this.httpPort + 1}`,
                                       logCallback: this._syncLogCallback.bind(this),
                                       featureToken: process.env.SYNC_WORKER_FEATURE_TOKEN
        });
        this._proxy = new SyncServerProxy(this.httpPort, this.httpPort + 1);
    }

    start() {
        deleteFolderRecursive('realm-object-server');

        return this._server.start().then(() => {
            return Realm.open({
                path: path.join(this._temp.name, 'admin.realm'),
                schema: adminRealmSchema,
                sync: {
                    user: this.adminUser,
                    url: `realm://127.0.0.1:${this.httpPort}/__admin`
                }
            });
        }).then(realm => {
            this.adminRealm = this._proxy.adminRealm = realm;
            return waitForUpload(this.adminRealm);
        });
    }

    shutdown() {
        let promise;
        if (this.adminRealm) {
            promise = waitForUpload(this.adminRealm);
            this.adminRealm.close();
        }
        else {
            promise = Promise.resolve();
        }
        return promise.then(() => {
            this._proxy.stopping = true;
            return this._server.stop();
        }).then(() => {
            this._server = null;
            this._proxy.stop();
            this._temp.removeCallback();
            deleteFolderRecursive('realm-object-server');
        });
    }

    createRealm(serverPath, schema, localPath) {
        return Realm.open({
            path: localPath,
            schema: schema,
            sync: {
                user: this.adminUser,
                url: `realm://127.0.0.1:${this.httpPort}/` + serverPath
            }
        }).then(r => waitForUpload(r));
    }

    deleteRealm(serverPath) {
        // On startup we delete the entire realm-object-server directory, which
        // causes problems for the client code which handles Realm deletions
        // Real ROS doesn't delete its state on startup so this is a test-specific issue
        mkdirp.sync('realm-object-server/io.realm.object-server-utility/metadata');

        const realm = this.adminRealm;
        realm.write(() => {
            const objects = realm.objects('RealmFile').filtered('path = $0', serverPath);
            if (objects.length != 1) {
                throw new Error(`Realm ${serverPath} not found. Existing Realms: ${realm.objects('RealmFile').map(r => r.path)}`);
            }
            realm.delete(objects);
        });

        // Tell the sync worker to delete the Realm
        const request = http.request({
            host: 'localhost',
            port: this.httpPort,
            path: `/api/realm/${serverPath}`,
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

    _writeConfiguration() {
        fs.writeFileSync(path.join(this._temp.name, 'config.yaml'),
        `
        storage:
          root_path: ${this._temp.name}

        auth:
          public_key_path: ${path.join(this._temp.name, 'public.pem')}
        `);
    }

    _syncLogCallback(level, message) {
        this.emit('log', syncLevels[level], message);
    }
};

function signAdminToken(key, token) {
    const tokenStr = JSON.stringify(token);
    const signature = key.sign(new Buffer(tokenStr), 'base64', 'base64');
    const tokenB64 = new Buffer(tokenStr).toString('base64');
    return `${tokenB64}:${signature}`;
}
