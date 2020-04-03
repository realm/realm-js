import { Transport } from "../transports";

export class EmailPasswordAuthProvider {
    private readonly transport: Transport;

    constructor(transport: Transport) {
        this.transport = transport;
    }
}
