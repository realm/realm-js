/**
 * Specify that the decorated field should be indexed by Realm.
 * See: https://www.mongodb.com/docs/realm/sdk/react-native/examples/define-a-realm-object-model/#index-a-property
 */
export declare function index(target: any, memberName: string): void;
/**
 * Specify that the decorated field should be remapped to a different property name in the Realm database.
 * See: https://www.mongodb.com/docs/realm/sdk/react-native/examples/define-a-realm-object-model/#remap-a-property
 * @param realmPropertyName The name of the property in the Realm database
 */
export declare function mapTo(realmPropertyName: string): (target: any, memberName: string) => void;
