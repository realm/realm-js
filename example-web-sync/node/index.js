import Realm from "realm";

import config from "./config.json" assert { type: "json" };
import { SyncItemSchema } from "./models/SyncItem.js";

const { appId, partition } = config;
const app = new Realm.App({ id: appId });
let user;
let realm;

async function logIn() {
  try {
    user = await app.logIn(Realm.Credentials.anonymous());
  } catch (err) {
    console.error("Error logging in:", err.message);
    throw err;
  }
}

async function openRealm() {
  try {
    const config = {
      schema: [SyncItemSchema],
      sync: {
        user,
        partitionValue: partition,
        clientReset: {
          mode: Realm.ClientResetMode.RecoverOrDiscardUnsyncedChanges,
        },
      },
    };
    realm = await Realm.open(config);
  } catch (err) {
    console.error("Error opening the realm:", err.message);
    throw err;
  }
}

function deleteData() {
  if (realm) {
    realm.write(() => {
      realm.deleteAll();
    });
  }
}

function addData() {
  if (realm) {
    const NUM_ITEMS = 100;
    realm.write(() => {
      for (let i = 0; i < NUM_ITEMS; i++) {
        realm.create(SyncItemSchema.name, {
          _id: new Realm.BSON.ObjectId(),
          _partition: partition,
          fieldToUpdate: 0,
        });
      }
    });
  }
}

function updateData() {
  if (realm) {
    const items = realm.objects(SyncItemSchema.name);
    // Updating data one-by-one instead of in a single batch.
    for (let item of items) {
      realm.write(() => {
        item.fieldToUpdate = Math.floor(Math.random() * 10_000);
      });
    }
  }
}

async function main() {
  await logIn();
  await openRealm();
  deleteData();
  addData();

  console.log("Updating data..");
  updateData();
  console.log("Done!");

  if (realm && !realm.isClosed) {
    realm.close();
  }
}

main();
