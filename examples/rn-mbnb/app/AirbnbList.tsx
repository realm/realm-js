import { useApp, useUser } from "@realm/react";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Text,
  TextInput,
  View,
  StyleSheet,
  Button,
  ListRenderItem,
  Pressable,
  Platform,
} from "react-native";
import { useLocalQuery, useLocalRealm } from "./localRealm";
import { SearchCache } from "./localModels";
import { useSyncedQuery, useSyncedRealm } from "./syncedRealm";
import { ListingsAndReview } from "./syncedModels";
import FastImage from "react-native-fast-image";
import RNFS from "react-native-fs";

enum ResultMethod {
  None = "Search Not Performed",
  Cache = "Cache Hit",
  Local = "Local Full Text Search",
  Remote = "Atlas Search",
}

export const AirbnbList = () => {
  // The results of the most recent search
  const [resultIds, setResultIds] = useState([]);

  // Offline mode is toggled in state and will effect how search is performed
  const [offlineMode, setOfflineMode] = useState(false);

  // The search term is stored in state
  const [searchTerm, setSearchTerm] = useState("");

  // Ids of all search results that are stored in Realm
  const [cachedIds, setCachedIds] = useState([]);

  // The method used to get the search results
  const [resultMethod, setResultMethod] = useState<ResultMethod>(
    ResultMethod.None
  );

  // Size of the synced and local Realm databases
  const [syncedDbSize, setSyncedDbSize] = useState(0);
  const [localDbSize, setLocalDbSize] = useState(0);

  // Size of the image cache from react-native-fast-image
  const [cacheSize, setCacheSize] = useState(0);

  // Get the local Realm database for cache entries
  const localRealm = useLocalRealm();

  // Get the synced Realm database containing all subscribed listing items
  const syncedRealm = useSyncedRealm();

  // Get the current user in order to call the search function
  const user = useUser();

  // Check the local cache for search results
  const cache = useLocalQuery(
    SearchCache,
    (col) => col.filtered("searchTerm == $0", searchTerm.toLowerCase()),
    [searchTerm]
  );

  // Get all cached search results in order to build our flexible sync subscription
  const fullCache = useLocalQuery(SearchCache);

  // Get the listings that match the search results ids
  const listings = useSyncedQuery(
    ListingsAndReview,
    (col) => col.filtered("_id in $0", resultIds),
    [resultIds]
  );

  // Setup our flexible sync subscription.
  // This will get all unique ids from all search results in the cache
  // in order to subscribe to the listings that match those ids.
  // WARNING: In production, developers should be mindful how large this gets
  // as if the query string is too large, it will not work. (256kb limit ~20k ids)
  // Set limits and manage cache size as appropriate.
  useEffect(() => {
    const allIds = fullCache.reduce((acc, cache) => {
      acc.push(...cache.results);
      return acc;
    }, []);
    const uniqueIds = [...new Set(allIds)];
    console.log("Updating subscription to: ", uniqueIds);
    syncedRealm
      .objects(ListingsAndReview)
      .filtered("_id in $0", uniqueIds)
      .subscribe({ name: "listing" });

    setCachedIds(uniqueIds);
  }, [fullCache]);

  // Perform the search method based on the current state
  const doSearch = async () => {
    if (searchTerm !== "") {
      // Check the cache first
      if (cache.length > 0) {
        console.log("Cache hit!: ", JSON.stringify(cache));
        const ids = cache[0].results.reduce((res, cur) => {
          res.push(cur);
          return res;
        }, []);
        setResultIds(ids);
        setResultMethod(ResultMethod.Cache);
        // If we are in offline mode, we will do a full text search on the current Realm
      } else if (offlineMode) {
        const localSearchResults = syncedRealm
          .objects(ListingsAndReview)
          .filtered("name TEXT $0", searchTerm);
        const ids = localSearchResults.map((item) => item._id);

        setResultIds(ids);
        setResultMethod(ResultMethod.Local);
        // If we are online, we will call the search function on the user object
      } else {
        const { result, error } = await user.functions.searchListings({
          searchPhrase: searchTerm,
          pageNumber: 1,
          pageSize: 100,
        });
        if (error) {
          console.error(error);
        } else {
          const ids = result.map((item) => item._id);

          setResultIds(ids);
          setResultMethod(ResultMethod.Remote);

          // Cache the results
          localRealm.write(() => {
            localRealm.create(SearchCache, {
              searchTerm: searchTerm.toLowerCase(),
              results: ids,
            });
          });
        }
      }
    } else {
      setResultIds([]);
    }
  };

  // Do this on every render
  useEffect(() => {
    getDatabaseSize();
    getCacheSize();
  });

  // Get the size of the Realm databases
  const getDatabaseSize = useCallback(async () => {
    const localDbFileInfo = await RNFS.stat(localRealm.path);
    const syncedDbFileInfo = await RNFS.stat(syncedRealm.path);
    setLocalDbSize(localDbFileInfo.size / (1024 * 1024));
    setSyncedDbSize(syncedDbFileInfo.size / (1024 * 1024));
  }, [listings]);

  // Get the size of the image cache
  const getCacheSize = useCallback(async () => {
    const cacheDir =
      Platform.OS == "ios"
        ? `${RNFS.CachesDirectoryPath}/com.hackemist.SDImageCache/default`
        : `${RNFS.CachesDirectoryPath}/image_manager_disk_cache`;
    console.log("Cache dir: ", cacheDir);
    const files = await RNFS.readDir(cacheDir);
    let totalSize = 0;
    for (const file of files) {
      const fileInfo = await RNFS.stat(file.path);
      totalSize += fileInfo.size;
    }
    const sizeInMB = totalSize / (1024 * 1024);
    setCacheSize(parseFloat(sizeInMB.toFixed(2))); // Round to 2 decimal places
  }, []);

  // Clear the image cache and Realm databases
  const clearCache = useCallback(async () => {
    await FastImage.clearMemoryCache();
    await FastImage.clearDiskCache();
    // NOTE: If you are offline, the data will not clear until you go online
    // Atlas will return a change set which will remove the data.
    syncedRealm.subscriptions.update((mutableSubs) => {
      mutableSubs.removeAll();
    });
    // WARNING: This will delete all data in the synced Realm database.
    // Permissions should be set so the user cannot actually perform this.
    // Atlas Device Sync will revert this change.
    // This should only be necessary if offline.
    if (offlineMode) {
      syncedRealm.write(() => {
        syncedRealm.deleteAll();
      });
    }
    // Clear the local cache
    localRealm.write(() => {
      localRealm.deleteAll();
    });
    alert("Cache cleared!");
  }, []);

  // This is fake offline mode for demo purposes.
  useEffect(() => {
    offlineMode
      ? syncedRealm.syncSession.pause()
      : syncedRealm.syncSession.resume();
  }, [offlineMode]);

  const renderListing: ListRenderItem<ListingsAndReview> = useCallback(
    ({ item }) => (
      <Pressable
        onPress={() => {
          alert(JSON.stringify(item.toJSON()));
        }}
      >
        <View style={styles.listing}>
          <FastImage
            style={styles.image}
            source={{
              uri: item.images.picture_url,
              priority: FastImage.priority.normal,
              cache: FastImage.cacheControl.immutable,
            }}
          />
          <Text>{item.name}</Text>
        </View>
      </Pressable>
    ),
    []
  );

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Enter Search Term..."
        style={styles.searchInput}
        value={searchTerm}
        onChangeText={setSearchTerm}
      />
      <Button title="Do Search" onPress={doSearch} />
      <FlatList
        data={listings}
        renderItem={renderListing}
        keyExtractor={(item) => item._id}
      />
      <View style={styles.footer}>
        <Text>Local Database size: {localDbSize} mb</Text>
        <Text>Synced Database size: {syncedDbSize} mb</Text>
        <Text>Image Cache size: {cacheSize} mb</Text>
        <Text>Cached entry count: {cachedIds.length}</Text>
        <Text>Search method: {resultMethod}</Text>
        <Button
          title={`${offlineMode ? "Disable" : "Enable"} Offline Mode`}
          onPress={() => setOfflineMode((prevOfflineMode) => !prevOfflineMode)}
        />
        <Button title="Clear Cache" onPress={clearCache} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listing: {
    flexDirection: "row",
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
  image: {
    width: 50,
    height: 50,
    marginRight: 10,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: "#ccc",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 23,
    paddingVertical: 12,
    paddingHorizontal: 6,
    margin: 6,
  },
});
