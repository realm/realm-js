import { Transport } from "../transports";

export class ApiKeyAuthProvider {
    private readonly transport: Transport;

    constructor(transport: Transport) {
        this.transport = transport;
    }
}
