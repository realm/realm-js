////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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
console.log("download-api-helper started");
const appId = process.argv[2];
const baseUrl = process.argv[3];
const partition = process.argv[4];
const realmModule = process.argv[5];

function trySetElectronVersion() {
  if (!process.versions || !process.env.REALM_ELECTRON_VERSION) {
    return;
  }

  const descriptor = Object.getOwnPropertyDescriptor(process.versions, "electron");
  if (descriptor.writable) {
    process.versions.electron = process.env.REALM_ELECTRON_VERSION;
  }

  if (descriptor.set) {
    descriptor.set(process.env.REALM_ELECTRON_VERSION);
  }
}

// Ensure node-pre-gyp uses the correct binary
trySetElectronVersion();

const { Realm } = require(realmModule);
const { ObjectId } = Realm.BSON;

function createObjects(user) {
  const config = {
    sync: {
      user: user,
      partitionValue: partition,
      onError: (err) => console.log(err),
    },
    schema: [
      {
        name: "Dog",
        primaryKey: "_id",
        properties: {
          _id: "objectId",
          breed: "string?",
          name: "string",
          realm_id: "string?",
        },
      },
    ],
  };

  const realm = new Realm(config);
  realm.write(() => {
    for (let i = 1; i <= 3; i++) {
      realm.create("Dog", { _id: new ObjectId(), name: `Lassy ${i}` });
    }
  });

  let session = realm.syncSession;
  return new Promise((resolve, reject) => {
    let callback = (transferred, total) => {
      if (transferred === total) {
        session.removeProgressNotification(callback);
        resolve(realm);
      }
    };
    session.addProgressNotification("upload", "forCurrentlyOutstandingWork", callback);
  });
}

const credentials = Realm.Credentials.anonymous();
const appConfig = {
  id: appId,
  baseUrl,
  timeout: 1000,
  app: {
    name: "default",
    version: "0",
  },
};

let app = new Realm.App(appConfig);
app
  .logIn(credentials)
  .catch((error) => {
    console.error(`download-api-helper failed:\n User login error:\n${error}`);
    process.exit(-2);
  })
  .then((user) => createObjects(user))
  .catch((error) => {
    console.error(`download-api-helper failed:\n Create object error:\n${error}`);
    process.exit(-3);
  })
  .then((realm) => {
    realm.close();
    process.exit(0);
  });
