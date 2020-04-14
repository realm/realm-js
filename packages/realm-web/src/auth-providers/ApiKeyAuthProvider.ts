import { Transport } from "../transports";
import { deserialize } from "../utils/ejson";

/** @inheritdoc */
export class ApiKeyAuthProvider
    implements Realm.AuthProviders.ApiKeyAuthProvider {
    private readonly transport: Transport;

    constructor(transport: Transport) {
        this.transport = transport.prefix("/auth/api_keys");
    }

    /** @inheritdoc */
    create(name: string): Promise<Realm.AuthProviders.ApiKey> {
        return this.transport
            .fetch({
                method: "POST",
                body: { name }
            })
            .then(deserialize);
    }

    /** @inheritdoc */
    get(keyId: Realm.ObjectId): Promise<Realm.AuthProviders.ApiKey> {
        return this.transport
            .fetch({
                method: "GET",
                path: "/" + keyId.toHexString()
            })
            .then(deserialize);
    }

    /** @inheritdoc */
    list(): Promise<Realm.AuthProviders.ApiKey[]> {
        return this.transport.fetch({ method: "GET" }).then(deserialize);
    }

    /** @inheritdoc */
    delete(keyId: Realm.ObjectId): Promise<void> {
        return this.transport
            .fetch({
                method: "DELETE",
                path: "/" + keyId.toHexString()
            })
            .then(deserialize);
    }

    /** @inheritdoc */
    enable(keyId: Realm.ObjectId): Promise<void> {
        return this.transport
            .fetch({
                method: "PUT",
                path: "/enable/" + keyId.toHexString()
            })
            .then(deserialize);
    }

    /** @inheritdoc */
    disable(keyId: Realm.ObjectId): Promise<void> {
        return this.transport
            .fetch({
                method: "PUT",
                path: "/disable/" + keyId.toHexString()
            })
            .then(deserialize);
    }
}
