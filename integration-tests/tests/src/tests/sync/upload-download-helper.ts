import Realm from "realm";

export function uploadDownloadHelper(
  extraConfig: Partial<Realm.Configuration>,
  writeCallback: (realm: Realm) => void | Promise<void>,
  afterCallback: (realm: Realm) => void | Promise<void>,
) {
  throw new Error("Not implemented");
}