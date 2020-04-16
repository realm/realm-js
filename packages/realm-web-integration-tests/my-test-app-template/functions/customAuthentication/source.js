/* global context */

exports = async function (loginPayload) {
    // Get a handle for the app.users collection
    const users = context.services
        .get("mongodb-atlas")
        .db("app")
        .collection("users");

    // Parse out custom data from the FunctionCredential

    const { username, secret } = loginPayload;

    if (secret !== "v3ry-s3cret") {
        throw new Error("Ah ah ah, you didn't say the magic word");
    }
    // Query for an existing user document with the specified username

    const user = await users.findOne({ username });

    if (user) {
        // If the user document exists, return its unique ID
        return user._id.toString();
    } else {
        // If the user document does not exist, create it and then return its unique ID
        const result = await users.insertOne({ username });
        return result.insertedId.toString();
    }
};
