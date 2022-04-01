## Setting up a Realm app in the cloud

To enable sync, first you need to register for MongoDB Atlas and set up a new free Realm app:

1. Go to https://www.mongodb.com/cloud/atlas/register and register a new account and fill out the initial questionaire
1. On the "deploy a cloud database" screen, click "I'll do this later" (in the bottom left)
1. From the Atlas homepage, click on the Realm tab at the top
1. From the "Welcome to MongoDB Realm" wizard, select "Build your own app" and click "Next"
1. Accept the default values for data source, application and deployment model by clicking "Create Realm Application"
1. Close the "Welcome to your Application Guides" popup
1. Choose "Sync" from the left hand menu
1. Press "Start Syncing"
1. In the "Already have data in Atlas?" popup, click "No thanks, continue to Sync"
1. Under "Select Development Details", select "Flexible" sync
1. Turn "Development Mode" on
1. From "Select a cluster to sync", select "RealmCluster"
1. From "Select or add a database name", select "Add new database", then in the "Create a new database name" box, enter "todolist" and click "Create"
1. Leave the "Select or add a queryable field" box empty
1. Under "Define permissions", select the "Users can only read and write their own data" template
1. Change the user ID field name from `owner_id` to `userId` in the permissions template:
	```
	{
		"defaultRoles": [
			{
				"name": "owner-read-write",
				"applyWhen": {},
				"read": {"userId": "%%user.id"},
				"write": {"userId": "%%user.id"}
			}
		]
	}
	```
1. Click the "Enable Sync" button at the bottom and in the "Confirm" popup, click "Enable Sync" again
1. At the top of the screen, click "Review draft & deploy", and in the "Deployment Draft" popup, click the "Deploy" button (you will not have to do this for future changes while you are in development mode)
1. Go to "Authentication" from the left hand menu
1. Click "Edit" on the "Email/Password" provider row
1. Set "Provider Enabled" to "On"
1. Set "User Confirmation Method" to "Automatically confirm users"
1. Set "Password Reset Method" to "Run a password reset function"
1. Generate the default resetFunc.  You can change this later
1. Click the "Save" button

### Enabling sync in the template app

To enable sync in the template app:

1. Open `sync.config.js` in a text editor
1. Change `enabled: false` on line 3 to `enabled: true`
1. Copy your Realm app ID by clicking on the copy icon at the top of the left hand menu (it will say "Application-0" if you are using the defaults) – this will be something like "application-0-abcde"
1. Change `appId: "<Your App ID>"` on line 5 to use your app ID, e.g. `appId: "application-0-abcde"`
1. Restart the app and you will be asked to login or register – start by registering a new account
1. Once you are logged in, you will see your tasks – if you login with the same user on another device, you will see that the two are in sync
1. You can press "log out" at the bottom of the screen and login or register as another user
