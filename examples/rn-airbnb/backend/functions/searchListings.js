exports = async function({ searchPhrase, pageNumber, pageSize }){
  // Find the name of the MongoDB service you want to use (see "Linked Data Sources" tab)
  const serviceName = "mongodb-atlas";

  // Update these to reflect your db/collection/search index
  const dbName = "sample_airbnb";
  const collName = "listingsAndReviews";
  const searchIndexName = "airBnB"
  

  // Get a collection from the context
  const collection = context.services.get(serviceName).db(dbName).collection(collName);
  
  console.log(searchPhrase)

  let findResult;
  try {
  
    // Calculate the skip value
    const skip = (pageNumber - 1) * pageSize;
    
    // Define the search query
    const pipeline = [{ $search: {
      index: searchIndexName,
      text: {
        query: searchPhrase,
        path: {
          wildcard: "*"
        }
      }
    }},
    { $skip: skip },
    { $limit: pageSize }
    ];

  
    // Perform the search with pagination
    findResult = await collection.aggregate(pipeline)
                                    .toArray();

  } catch(err) {
    console.log("Error occurred while executing search:", err.message);

    return { error: err.message };
  }

  return { result: findResult };
};