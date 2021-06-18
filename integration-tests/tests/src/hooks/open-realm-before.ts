import Realm from "realm";

// Either the sync property is left out (local Realm)
type LocalConfiguration = Omit<Realm.Configuration, "sync"> & { sync?: never };
// Or the sync parameter is present
type SyncedConfiguration = Omit<Realm.Configuration, "sync"> & { sync?: Partial<Realm.SyncConfiguration> };

export function openRealmBefore(config: LocalConfiguration | SyncedConfiguration = {}) {
  before(async function(this: Partial<RealmContext> & Mocha.Context) {
    const nonce = new Realm.BSON.ObjectID().toHexString();
    const path = `temp-${nonce}.realm`;
    if (this.realm) {
      throw new Error("Unexpected realm on context, use only one openRealmBefore per test");
    } else if (!config.sync) {
      this.config = { ...config, path } as LocalConfiguration;
      this.realm = new Realm(this.config);
    } else {
      this.config = {
        ...config,
        path,
        sync: {
          user: this.user,
          partitionValue: nonce,
          _sessionStopPolicy: "immediately",
          ...config.sync,
        },
      } as Realm.Configuration;
      this.realm = new Realm(this.config);
      // Upload the schema, ensuring a valid connection
      await this.realm.syncSession.uploadAllLocalChanges();
    }
  });

  // Clean up afterwards
  after(function (this: RealmContext) {
    if (this.realm) {
      this.realm.close();
      delete this.realm;
    } else {
      throw new Error("Expected a 'realm' in the context");
    }
    if (this.config) {
      Realm.deleteFile(this.config);
      delete this.config;
    } else {
      throw new Error("Expected a 'config' in the context");
    }
    // Clearing the test state to ensure the sync session gets completely reset and nothing is cached between tests
    Realm.clearTestState();
  });
}