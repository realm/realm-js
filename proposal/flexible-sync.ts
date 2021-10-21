const app = new Realm.App();
const Schema = {};
const user = {};
type Contact = {};
type SaleOrder = {};
type UserPreference = {};

// A single subscription
interface Subscription {
  // When the subscription was created. Recorded automatically.
  readonly createdAt: Date;

  // When the subscription was last updated. Recorded automatically.
  readonly updatedAt: Date;

  // Name of the subscription; if not specified it will return
  // the value in Query
  readonly name: string;

  // The type of objects the subscription operates on.
  readonly objectType: string;

  // The RQL representation of the query the subscription was created with.
  readonly query: string;
}

async () => {
  // Open Realm with flexible sync config
  const config = {
    schema: [Schema],
    sync: {
      user,
      flexible: true,
    },
  };

  const realm = await Realm.open(config);

  // Add subscriptions
  await realm.updateSubscriptions(subs => {
    subs.add(new Realm.Subscription<Contact>({
      type: "Contact",
      query: "address.state == 'NY'",
    }));

    subs.add(new Realm.Subscription<SaleOrder>({
      type: "SaleOrder",
      query: "author.id == $0",
      parameters: [app.currentUser],
      name: "MyOrders",
    }));

    subs.add(new Realm.Subscription<UserPreference>({
      type: "UserPreference",
      query: "userId == $0",
      parameters: [app.currentUser],
      name: "MyPrefs",
    }));
  });

  // Check for and add subscription if not present
  if (!realm.getSubscriptionByName('contacts-tx')) {
    await realm.updateSubscriptions(subs => {
      subs.add(new Realm.Subscription<Contact>({
        type: "Contact",
        query: "address.state = 'TX'",
        name: "contacts-tx"
      }));
    });
  }

  // Remove subscription
  await realm.updateSubscriptions(subs => {
    subs.removeByName('contacts-tx');
  });
};
