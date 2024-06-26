import Realm from "realm";

export class SearchCache extends Realm.Object<SearchCache> {
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
