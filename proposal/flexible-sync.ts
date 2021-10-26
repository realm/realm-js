// ISubscription
// Represents a single query with its optional name and additional metadata

// A single subscription
interface Subscription<T> {
  // When the subscription was created. Recorded automatically.
  readonly createdAt: Date;

  // When the subscription was last updated. Recorded automatically.
  readonly updatedAt: Date;

  // Name of the subscription; if not specified it will return the query as a string.
  readonly name: string;

  // The type of objects the subscription operates on.
  // TODO do we need this in JS?
  readonly objectType: string;

  // The query the subscription was created with.
  readonly query: Realm.Results<T & Realm.Object>;
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

// SubscriptionSet
// Represents a mutable collection of all the subscriptions for the Realm. Using the mutating methods outside of a write call will be a runtime exception.

// A mutable collection of subscriptions. Mutating it can only happen in a write/writeAsync callback.
interface SubscriptionSet {
  // TODO do we need other array-like methods? In C# this extends IEnumberable
  length: number;

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
  readonly error: Error;

  // Wait for the server to acknowledge and send all the data associated
  // with this collection of subscriptions. If State is Complete, this method
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
  // TODO do we want this in JS?
  // add: (className: string, query: string, options: SubscriptionOptions | undefined) => void;

  // Add a query to the list of subscriptions. Optionally, provide a name
  // and other parameters.
  add: <T>(query: Realm.Results<T & Realm.Object>, options: SubscriptionOptions | undefined) => void;

  // Remove a subscription by name. Returns false if not found.
  removeByName: (name: string) => boolean;

  // Remove a subscription by query. Returns false if not found.
  remove: <T>(query: Realm.Results<T & Realm.Object>) => boolean;

  // Remove a concrete subscription. Returns false if not found.
  removeSubscription: <T>(subscription: Subscription<T>) => boolean;

  // Remove all subscriptions. Returns number of removed subscriptions.
  // TODO do we want this? Was "Remove all subscriptions for type" RemoveAll<T>
  removeAll: () => void;

  // Remove all subscriptions for type. Returns number of removed subscriptions.
  removeAllByType: (objectType: string) => void;
}

// Realm.GetSubscriptions
// Introduce a new method on Realm related to flexible sync - GetSubscriptions:

declare class Realm {
  // ...

  // Get all subscriptions for this Realm. SDKs that care deeply about queries
  // on the main thread may also expose an async version of this API
  getSubscriptions: () => SubscriptionSet;
}

// Usage examples
// Here’s a usage example for the new API. It is intended to foster discussion and align around a compelling user-facing API. We’ll likely clean it up after the design approval process.

async () => {
  // Open Realm with flexible sync config
  const config = {
    schema: [Schema],
    sync: {
      user: currentUser,
      flexible: true,
    },
  };

  const realm = await Realm.open(config);

  const subs = realm.getSubscriptions();

  if (subs.state === SubscriptionState.Error) {
    console.error("App is not syncing...");
  }

  if (subs.length === 0) {
    try {
      console.log("Downloading initial data...");

      await subs.writeAsync(() => {
        subs.add(realm.objects<Contact>("Contact").filtered("address.state == 'NY'"));
        subs.add(realm.objects<SaleOrder>("SaleOrder").filtered("author.id == $0", currentUser), { name: "MyOrders" });
        subs.add(realm.objects<UserPreference>("UserPreference").filtered("userId == $0", currentUser), {
          name: "MyPrefs",
        });
      });

      await subs.waitForSynchronization();
    } catch (e) {
      console.error("Error downloading initial data");
    }
  }

  // Later when moving to another screen
  const subs = realm.getSubscriptions();
  const texasContacts = realm.objects<Contact>('address.state == "TX"');

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
  // Open Realm with flexible sync config
  const config = {
    schema: [Schema],
    sync: {
      user: currentUser,
      flexible: true,
      error: (e) => {
        // Handle errors here
        // TODO how to distinguish flexible sync error? Is it a `category`?
      },
    },
  };

  try {
    await subs.writeAsync(() => {
      subs.add(realm.objects<Foo>('Foo').filtered('invalid query'), { name: "my-sub" });
    });
  }
  catch(e) {
    // TODO how to test if error is flexible sync error?
    console.error("Couldn't download new data!");
    await subs.writeAsync(() => {
      subs.removeByName('my-sub');
    });
  }

};
