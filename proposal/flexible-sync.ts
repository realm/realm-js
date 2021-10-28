// Subscription
// Represents a single query with its optional name and additional metadata

// A single subscription
interface Subscription<T> {
  // When the subscription was created. Recorded automatically.
  readonly createdAt: Date;

  // When the subscription was last updated. Recorded automatically.
  readonly updatedAt: Date;

  // Name of the subscription; if not specified it will return
  // the query as a string.
  readonly name: string;

  // The type of objects the subscription operates on.
  readonly objectType: string;

  // The query the subscription was created with.
  readonly query: Realm.Results<T & Realm.Object>;
}

// ================================================

// SubscriptionSet
// Represents a mutable collection of all the subscriptions for the Realm. Using the mutating methods outside of a write call will be a runtime exception.

// A mutable collection of subscriptions. Mutating it can only happen in a write/writeAsync callback.
interface SubscriptionSet {
  // Returns true if there are no subscriptions in the set
  readonly empty: boolean;

  // Find a subscription by name, null if not found.
  findByName<T>(name: string): Subscription<T> | null;

  // Find a subscription by query, null if not found.
  // Will match both named and unnamed subscriptions.
  find<T>(query: Realm.Results<T & Realm.Object>): Subscription<T> | null;

  // The state of this collection - is it acknowledged by the server and
  // has the data been downloaded locally.
  readonly state: SubscriptionState;

  // The exception containing information for why this collection is in the
  // Error state. If State is not Error, this will be null.
  readonly error: Realm.SyncError;

  // Wait for the server to acknowledge and send all the data associated
  // with this collection of subscriptions. If the State is Complete, this method
  // will return immediately. If the State is Error, this will throw an error
  // immediately. If someone updates the Realm subscriptions while waiting,
  // this will throw a specific error.
  waitForSynchronization: () => Promise<void>;

  // Creates a write transaction and updates this subscription set.
  write: (callback: () => void) => void;

  // Asynchronously creates and commits a write transaction to update
  // the subscription set. Doesn't call waitForSynchronization.
  writeAsync: (callback: () => void) => Promise<void>;

  // Add a query to the list of subscriptions. Optionally, provide a name
  // and other parameters.
  // NOTE: This is not in scope for beta
  // addQueryByString: <T>(className: string, query: string, options: SubscriptionOptions | undefined, ...args: any[]) => Subscription<T>;

  // Add a query to the list of subscriptions. Optionally, provide a name
  // and other parameters.
  add: <T>(query: Realm.Results<T & Realm.Object>, options: SubscriptionOptions | undefined) => Subscription<T>;

  // Remove a subscription by name. Returns false if not found.
  removeByName: (name: string) => boolean;

  // Remove a subscription by query. Returns false if not found.
  remove: <T>(query: Realm.Results<T & Realm.Object>) => boolean;

  // Remove a concrete subscription. Returns false if not found.
  removeSubscription: <T>(subscription: Subscription<T>) => boolean;

  // Remove all subscriptions. Returns number of removed subscriptions.
  // TODO do we want this in JS? In C#, it is:
  //
  // Remove all subscriptions for type. Returns number of removed subscriptions.
  // int RemoveAll<T>();
  //
  // but there isn't really a JS equivalent in terms of taking a specific type T
  removeAll: () => number;

  // Remove all subscriptions for object type. Returns number of removed subscriptions.
  removeAllByObjectType: (objectType: string) => number;
}

enum SubscriptionState {
  // Subscription is complete and the server is in "steady-state" synchronization.
  Complete,
  // The Subscription encountered an error.
  Error,
  // Subscription is persisted locally but not yet processed by the server.
  // It may or may not have been seen by the server.
  Pending,
}

// ================================================

// SubscriptionOptions
// A wrapper holding configuration options when creating a subscription. It is intended as an extension point for when we add ttls and other functionality.

// Options for SubscriptionSet.add
interface SubscriptionOptions {
  // Name of the subscription, optional.
  name?: string;

  // Whether to update an existing subscription. If set to false, trying to
  // add a subscription with the same name but different query will throw.
  // Defaults to true if undefined.
  // Adding an identical subscription (query+name) is a no-op.
  updateExisting?: boolean;
}

// ================================================

// Realm.getSubscriptions

declare class Realm {
  // ...

  // Get all subscriptions for this Realm.
  getSubscriptions: () => SubscriptionSet;
}

// ================================================

// Usage examples

// Open Realm with flexible sync config
const config = {
  schema: [Schema],
  sync: {
    user: currentUser,
    // TypeScript definitions + config checking will enforce that `partitionValue` can't be used with `flexible: true`
    flexible: true,
  },
};

const realm = await Realm.open(config);

// Initial state - we don't have any subscriptions
const subs = realm.getSubscriptions();

if (subs.empty) {
  try {
    console.log("Downloading initial data...");

    await subs.writeAsync(() => {
      subs.add(realm.objects<Contact>("Contact").filtered("address.state == 'NY'"));
      // or with class-based schemas: subs.add(realm.objects(Contact).filtered("address.state == 'NY'"));
      subs.add(realm.objects<SaleOrder>("SaleOrder").filtered("author.id == $0", currentUser), { name: "MyOrders" });
      subs.add(realm.objects<UserPreference>("UserPreference").filtered("userId == $0", currentUser), {
        name: "MyPrefs",
      });

      // Post-beta we might also support:
      // subs.add("Contact", "address.state == 'NY'");
      // although this may be problematic in terms of finding/removing the subscription when interpolated arguments are used
    });

    await subs.waitForSynchronization();
  } catch (e) {
    console.error("Error downloading initial data");
  }
}

// Later when moving to another screen
const subs = realm.getSubscriptions();
const texasContacts = realm.objects<Contact>("Contact").filtered("address.state == 'TX'");

// Check for and add subscription if not present
if (!subs.find(texasContacts)) {
  // or: subs.findByName('contacts-tx');
  console.log("Loading new data...");

  try {
    await subs.writeAsync(() => {
      subs.add(texasContacts, { name: "contacts-tx" });
    });

    await subs.waitForSynchronization();

    console.log("Contacts updated");
  } catch (e) {
    console.error("Failed to download the Texas contacts");
  }
}

// Remove subscription
await subs.writeAsync(() => {
  subs.remove(texasContacts); // or: subs.removeByName("contacts-tx");
});

// Error handling
const config = {
  schema: [Schema],
  sync: {
    user: currentUser,
    flexible: true,
    error: (e) => {
      // Handle errors here
      // Flexible sync errors can be distinguished as they will have their own `code`s
    },
  },
};

// Alternatively - check the state on app launch
if (subs.state === SubscriptionState.Error) {
  console.error("App is not syncing...");
}

// When updating subscriptions
try {
  await subs.writeAsync(() => {
    subs.add(realm.objects<Foo>("Foo"), { name: "my-sub" });
  });

  await subs.waitForSynchronization();
} catch (e) {
  console.error("Couldn't download new data!");

  // Error is thrown while waiting for synchronisation, remove the subscription
  await subs.writeAsync(() => {
    subs.removeByName("my-sub");
  });
}
