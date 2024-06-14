import Realm, { BSON } from "realm";

export class SearchCache extends Realm.Object<Cache> {
  searchTerm!: string;
  results!: Realm.List<string>;

  static schema: Realm.ObjectSchema = {
    name: "SearchCache",
    properties: {
      searchTerm: "string",
      results: "string[]",
    },
    primaryKey: "searchTerm",
  };
}

export const localModels = [SearchCache];
