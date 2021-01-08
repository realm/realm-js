import { Buffer } from "buffer";
// @ts-ignore
import { randomFillSync } from "crypto";

/* from `uuid` npm module START */

const pool = Buffer.alloc(256); // # of random values to pre-allocate
let poolPtr = pool.length;

const randomUuidBuffer = () => {
    if (poolPtr > pool.length - 16) {
        randomFillSync(pool);
        poolPtr = 0;
    }

    const buf = pool.slice(poolPtr, (poolPtr += 16));

    // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
    buf[6] = (buf[6] & 0x0f) | 0x40;
    buf[8] = (buf[8] & 0x3f) | 0x80;

    return buf;
};

const UUID_RX = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;

/* from `uuid` npm module END */

export class UUID {
    readonly _bsontype = "UUID"; // mimic the real bson types & let us validate in the same manner as other bson types.
    id: Buffer;

    constructor(input?: string | Buffer | UUID) {
        if (input) {
            if (typeof input === "string") {
                this.id = Buffer.from(input.replace(/-/g, ""), "hex");
            } else if (input instanceof Buffer) {
                this.id = input.slice(0, 16);
            } else if (input instanceof UUID) {
                this.id = input.id.slice(0, 16);
            } else {
                throw new Error("Unknown/unsupported input for UUID");
            }
        } else {
            this.id = randomUuidBuffer();
        }
    }

    toHexString() {
        const str = this.id.toString("hex");
        return (
            str.slice(0, 8) +
            "-" +
            str.slice(8, 12) +
            "-" +
            str.slice(12, 16) +
            "-" +
            str.slice(16, 20) +
            "-" +
            str.slice(20, 32)
        );
    }

    toString(format: BufferEncoding = "hex"): string {
        return format === "hex" ? this.toHexString() : this.id.toString(format);
    }

    toJSON() {
        return this.toString("hex");
    }

    toExtendedJSON() {
        return { $uuid: this.toHexString() };
    }

    equals(other?: UUID): boolean {
        if (other instanceof UUID) {
            return this.toString() === other.toString();
        }

        return false;
    }

    static generate(): UUID {
        const buf = randomUuidBuffer();
        return new UUID(buf);
    }

    static fromString(input: string): UUID {
        if (!UUID_RX.test(input)) {
            throw new Error(
                `Input format was not recognized for UUID string "${input}". This string should be of the following format: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx".`
            );
        }

        const buf = Buffer.from(input.replace(/-/g, ""), "hex");

        return new UUID(buf);
    }
}
