/* eslint-disable */

/**
 * Adds custom user data to the Users collection when a new user is created.
 */
exports = async function onUserCreation(user) {
  const customUserDataCollection = context.services.get("mongodb-atlas").db("AuthExample").collection("Users");
  try {
    await customUserDataCollection.insertOne({
      // Save the user's account ID to your configured user_id_field
      user_id: user.id,
      // Store any other user data you want
      team: "service",
    });
  } catch (e) {
    console.error(`Failed to create custom user data document for user:${user.id}`);
    throw e;
  }
};
