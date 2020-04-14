import { Transport } from "./transports/Transport";

/**
 * A list of names that functions cannot have to be callable through the functions proxy.
 */
const RESERVED_NAMES = ["inspect", "callFunction"];

interface CallFunctionBody {
    name: string;
    arguments: any[];
    service?: string;
}

export interface FunctionsFactoryConfiguration {
    transport: Transport;
    serviceName?: string;
}

/**
 * Defines how functions are called
 */
export class FunctionsFactory {
    private readonly transport: Transport;
    private readonly serviceName?: string;

    constructor({
        transport,
        serviceName = ""
    }: FunctionsFactoryConfiguration) {
        this.transport = transport;
        this.serviceName = serviceName;
    }

    /**
     * Call a remote function by it's name
     * @param name Name of the remote function
     * @param args Arguments to pass to the remote function
     */
    callFunction(name: string, ...args: any[]): Promise<any> {
        // See https://github.com/mongodb/stitch-js-sdk/blob/master/packages/core/sdk/src/services/internal/CoreStitchServiceClientImpl.ts
        const body: CallFunctionBody = { name, arguments: args };
        if (this.serviceName) {
            body.service = this.serviceName;
        }
        return this.transport.fetch({
            method: "POST",
            path: "/functions/call",
            body
        });
    }
}

/**
 * Create a factory of functions
 * @param fetcher The object used to perform HTTP fetching
 * @param serviceName An optional name of the service to call functions on
 */
export function create<FunctionsFactoryType extends Realm.FunctionsFactory>(
    config: FunctionsFactoryConfiguration
): FunctionsFactoryType {
    // Create a proxy, wrapping a simple object returning methods that calls functions
    // TODO: Lazily fetch available functions and return these from the ownKeys() trap
    const factory = new FunctionsFactory(config);
    // Wrap the factory in a promise that calls the internal call method
    return new Proxy((factory as any) as FunctionsFactoryType, {
        get(target, p, receiver) {
            if (typeof p === "string" && RESERVED_NAMES.indexOf(p) === -1) {
                return target.callFunction.bind(target, p);
            } else {
                return Reflect.get(target, p, receiver);
            }
        }
    });
}
