exports = async function (appId, userId) {
  return await deleteClientFile(`__realm_sync_${appId}`, userId) || await deleteClientFile(`__realm_sync`, userId);
};

async function deleteClientFile(db, userId) {
  const mongodb = context.services.get("mongodb");
  return (await mongodb.db(db)
  .collection("clientfiles")
  .deleteMany({ ownerId: userId }))
  .deletedCount > 0;
}