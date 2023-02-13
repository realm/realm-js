import { randomBytes } from "node:crypto";
import { AppImporter } from "@realm/app-importer";
import Realm, { App, Credentials, BSON, Configuration, SessionStopPolicy } from "realm";

function randomTimeout() {
  return Math.floor(Math.random() * 1000);
}

function sleep(ms: number = randomTimeout()) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomString() {
  return randomBytes(10).toString("hex");
}

type Person = {
  _id: BSON.ObjectId;
  name: string;
  age: number;
};

type ImportAppOptions = { importer: AppImporter, clusterName: string, databaseName: string };

async function importApp({ importer, clusterName, databaseName }: ImportAppOptions) {
  console.log("Started importing app");
  return await importer.importApp("./apps/with-db-flx", {
    "services/mongodb/config.json": {
      // type
      "config": {
        "clusterName": clusterName,
        "flexible_sync": {
          "database_name": databaseName,
        },
      },
    },
    "services/mongodb/rules/*.json": {
      database: databaseName,
    }
  });
}

type RoundtripDataOptions = { appId: string, baseUrl: string };

async function roundtripData({ appId, baseUrl }: RoundtripDataOptions) {
  console.log("Data roundtrip started");
  
  const app = new App({ id: appId, baseUrl });
  App.Sync.setLogLevel(app, "error");

  console.log("Authenticating towards the app");
  const credentials = Credentials.anonymous();
  const user = await app.logIn(credentials);

  console.log("Opening Realm");
  const config: Configuration = {
    path: `./realms/${randomString()}.realm`,
    schema: [{
      name: "Person",
      // TODO: File an issue on the missing errors when primary key is missing
      primaryKey: "_id",
      properties: {
        _id: "objectId",
        age: "int",
        name: "string",
      },
    }],
    sync: {
      user,
      flexible: true,
      _sessionStopPolicy: SessionStopPolicy.Immediately
    },
  };

  {
    const realm = await Realm.open(config);
    const persons = realm.objects("Person");

    console.log("Adding flexible subscription");
    await realm.subscriptions.update((subs) => {
      subs.add(persons);
    });

    if (persons.length > 0) {
      throw new Error("Expected an empty database!");
    }

    console.log("Writing data");
    realm.write(() => {
      realm.create("Person", { _id: new BSON.ObjectId(), name: "Alice", age: 34 });
    });

    console.log("Awaiting upload");
    await realm.syncSession?.uploadAllLocalChanges();

    console.log("Closing and deleting Realm");
    realm.close();
    Realm.deleteFile(config);
  }

  {
    const realm = await Realm.open(config);
    const persons = realm.objects<Person>("Person");

    console.log("Adding flexible subscription");
    await realm.subscriptions.update((subs) => {
      subs.add(persons);
    });

    console.log("Reading data");
    if (persons.length !== 1) {
      throw new Error(`Expected a database with a single person (got ${persons.length})`);
    }

    const [person] = persons;
    if (person.name !== "Alice") {
      throw new Error(`Expected a person named Alice, got ${person.name}`)
    }

    console.log("Closing and deleting Realm");
    realm.close();
    Realm.deleteFile(config);
  }
}

type DeleteAppOptions = { importer: AppImporter, appId: string };

async function deleteApp({ importer, appId }: DeleteAppOptions) {
  console.log(`Started deleting app (id = ${appId})`);
  await importer.deleteApp(appId);
}

export type StressOptions = {
  cycles: number;
  cluster: string;
  baseUrl: string;
  publicApiKey: string | undefined;
  privateApiKey: string | undefined;
};

export async function stress({ cluster: clusterName, cycles, baseUrl, publicApiKey, privateApiKey }: StressOptions) {
  if (typeof publicApiKey !== "string" || typeof privateApiKey !== "string") {
    throw new Error("Expected a pair of API keys");
  }

  console.log("Started stressing");

  // const databaseName = randomString();
  const databaseName = "stress-test-db";
  console.log(`Using database named '${databaseName}'`)

  const importer = new AppImporter({
    appsDirectoryPath: "./imported-apps",
    baseUrl,
    credentials: { kind: "api-key", publicKey: publicApiKey, privateKey: privateApiKey },
    realmConfigPath: "./realm-config.json"
  });
  for (let cycle = 0; cycle < cycles; cycle++) {
    const { appId } = await importApp({ importer, clusterName, databaseName });
    await sleep();
    try {
      await roundtripData({ appId, baseUrl });
      await sleep();
    } finally {
      await deleteApp({ importer, appId });
      await sleep();
    }
    console.log(`\n--- Completed cycle #${cycle} ---\n`);
    await sleep(1000);
  }
  console.log("All done!");
  process.exit();
}