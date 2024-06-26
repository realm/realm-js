exports = async function (arg) {
  // This default function will get a value and find a document in MongoDB
  // To see plenty more examples of what you can do with functions see:
  // https://www.mongodb.com/docs/atlas/app-services/functions/

  // Find the name of the MongoDB service you want to use (see "Linked Data Sources" tab)
  var serviceName = "mongodb-atlas";

  // Update these to reflect your db/collection
  var dbName = "sample_mflix";
  var collName = "movies";

  // Get a collection from the context
  var collection = context.services
    .get(serviceName)
    .db(dbName)
    .collection(collName);

  var findResult;
  try {
    // Get a value from the context (see "Values" tab)
    // Update this to reflect your value's name.
    var valueName = "value_name";
    var value = context.values.get(valueName);

    // Execute a FindOne in MongoDB
    findResult = await collection.aggregate([
      {
        $search: {
          index: "movies",
          text: {
            query: arg,
            path: {
              wildcard: "*",
            },
          },
        },
      },
    ]);
  } catch (err) {
    console.log("Error occurred while executing search:", err.message);

    return { error: err.message };
  }

  return { result: findResult };
};
