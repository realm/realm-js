/* eslint-disable */

/**
 * Creates a new store and returns its associated document.
 */
exports = async function(){
    const storeCollection = context.services.get("mongodb-atlas").db("StoreDemo").collection("Store");

    const result = await storeCollection.insertOne({kiosks:[]});
    const store = await storeCollection.findOne({_id: result.insertedId});
    return store;
};
