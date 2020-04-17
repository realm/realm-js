import { expect } from "chai";

import { createService } from "./HTTPService";
import { MockTransport } from "../test/MockTransport";

describe("HTTP service", () => {
    it("sends a GET request", async () => {
        const transport = new MockTransport([
            {
                hello: "world",
            },
        ]);
        const service = createService(transport, "my-http-service");
        const result = await service.get("http://localhost:1234/some-path", {
            headers: { "content-type": ["application/json"] },
        });
        expect(result).deep.equals({ hello: "world" });
        expect(transport.requests).deep.equals([
            {
                method: "POST",
                url: "http://localhost:1337/functions/call",
                body: {
                    name: "get",
                    service: "my-http-service",
                    arguments: [
                        {
                            headers: { "content-type": ["application/json"] },
                            url: "http://localhost:1234/some-path",
                        },
                    ],
                },
            },
        ]);
    });

    it("sends a POST request", async () => {
        const transport = new MockTransport([{}]);
        const service = createService(transport);
        await service.post("http://localhost:1234/some-path");
        expect(transport.requests[0].body.name).equals("post");
    });

    it("sends a PUT request", async () => {
        const transport = new MockTransport([{}]);
        const service = createService(transport);
        await service.put("http://localhost:1234/some-path");
        expect(transport.requests[0].body.name).equals("put");
    });

    it("sends a DELETE request", async () => {
        const transport = new MockTransport([{}]);
        const service = createService(transport);
        await service.delete("http://localhost:1234/some-path");
        expect(transport.requests[0].body.name).equals("delete");
    });

    it("sends a HEAD request", async () => {
        const transport = new MockTransport([{}]);
        const service = createService(transport);
        await service.head("http://localhost:1234/some-path");
        expect(transport.requests[0].body.name).equals("head");
    });

    it("sends a PATCH request", async () => {
        const transport = new MockTransport([{}]);
        const service = createService(transport);
        await service.patch("http://localhost:1234/some-path");
        expect(transport.requests[0].body.name).equals("patch");
    });
});
