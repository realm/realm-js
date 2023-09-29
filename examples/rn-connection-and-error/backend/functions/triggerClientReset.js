/* eslint-disable */

/**
 * Deletes the client files for the current App user which will trigger a client reset.
 *
 * @note
 * WARNING: THIS FUNCTION EXISTS FOR DEMO PURPOSES AND SHOULD NOT BE USED IN PRODUCTION!
 */
exports = async function triggerClientReset(arg) {
  // To find the name of the MongoDB service to use, see "Linked Data Sources" tab.
  const serviceName = "mongodb-atlas";
  const databaseName = `__realm_sync_${context.app.id}`;
  const collectionName = "clientfiles";

  const clientFilesCollection = context
    .services
    .get(serviceName)
    .db(databaseName)
    .collection(collectionName);

  try {
    return await clientFilesCollection.deleteMany({ ownerId: context.user.id });
  } catch (err) {
    console.error(
      `Failed to delete client file when executing \`triggerClientReset()\` for user \`${context.user.id}\`:`,
      err.message
    );
  }
};
