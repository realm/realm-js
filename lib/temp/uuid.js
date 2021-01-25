"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var buffer_1 = require("buffer");
// @ts-ignore
var crypto_1 = require("crypto");
/* from `uuid` npm module START */
var pool = buffer_1.Buffer.alloc(256); // # of random values to pre-allocate
var poolPtr = pool.length;
var randomUuidBuffer = function () {
    if (poolPtr > pool.length - 16) {
        crypto_1.randomFillSync(pool);
        poolPtr = 0;
    }
    var buf = pool.slice(poolPtr, (poolPtr += 16));
    // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
    buf[6] = (buf[6] & 0x0f) | 0x40;
    buf[8] = (buf[8] & 0x3f) | 0x80;
    return buf;
};
var UUID_RX = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
var UUID = /** @class */ (function () {
    function UUID(input) {
        this._bsontype = "UUID"; // mimic the real bson types & let us validate in the same manner as other bson types.
        if (input) {
            if (typeof input === "string") {
                this.id = buffer_1.Buffer.from(input.replace(/-/g, ""), "hex");
            }
            else if (input instanceof buffer_1.Buffer) {
                this.id = input.slice(0, 16);
            }
            else if (input instanceof UUID) {
                this.id = input.id.slice(0, 16);
            }
            else {
                throw new Error("Unknown/unsupported input for UUID");
            }
        }
        else {
            this.id = UUID.generate();
        }
    }
    UUID.prototype.toHexString = function () {
        var str = this.id.toString("hex");
        return (str.slice(0, 8) +
            "-" +
            str.slice(8, 12) +
            "-" +
            str.slice(12, 16) +
            "-" +
            str.slice(16, 20) +
            "-" +
            str.slice(20, 32));
    };
    UUID.prototype.toString = function (format) {
        if (format === void 0) { format = "hex"; }
        return format === "hex" ? this.toHexString() : this.id.toString(format);
    };
    UUID.prototype.toJSON = function () {
        return this.toString("hex");
    };
    UUID.prototype.toExtendedJSON = function () {
        return { $uuid: this.toHexString() };
    };
    UUID.prototype.equals = function (other) {
        if (other instanceof UUID) {
            return this.toString() === other.toString();
        }
        return false;
    };
    UUID.generate = function () {
        return randomUuidBuffer();
    };
    UUID.fromString = function (input) {
        if (!UUID_RX.test(input)) {
            throw new Error("Input format was not recognized for UUID string \"" + input + "\". This string should be of the following format: \"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\".");
        }
        var buf = buffer_1.Buffer.from(input.replace(/-/g, ""), "hex");
        return new UUID(buf);
    };
    UUID.fromExtendedJSON = function (doc) {
        return new UUID(doc.$uuid);
    };
    return UUID;
}());
exports.UUID = UUID;
