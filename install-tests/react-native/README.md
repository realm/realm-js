# How To Use

There are two commands for the cli tool:
`init` and `test`

The most common usage is the following:

`npm run init -- --react-native-version next --realm-version latest`

This will create the template for latest release candidate of React Native, install the latest publish `realm` package
and patch the install test code necessary for the next step.

`npm run test -- --platform ios`
`npm run test -- --platform android`

This will run test for `ios` and `android` respectively.  The `init` step is required first (without failures).
This will spawn the app and a server which will be waiting for the application to post a message to.
When the message has been sent, the test will shutdown and return a success code.
