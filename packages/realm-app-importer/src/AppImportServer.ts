////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

import {
    createServer,
    Server,
    RequestListener,
    ServerResponse,
    IncomingMessage,
} from "http";

import { AppImporter, TemplateReplacements } from "./AppImporter";

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
        let data = "";
        req.on("data", chunk => {
            data += chunk;
        })
            .once("end", () => {
                try {
                    const json = JSON.parse(data);
                    if (typeof json === "object") {
                        resolve(json);
                    } else {
                        throw new Error("Expected a body object");
                    }
                } catch (err) {
                    reject(err);
                }
            })
            .once("error", reject);
    });
}

export type AppTemplates = Record<string, string>;

export type ServerConfig = {
    hostname: string;
    port: number;
    /** Templates available for importing */
    appTemplates: AppTemplates;
};

export class AppImportServer {
    private static DEFAULT_CONFIG: ServerConfig = {
        hostname: "0.0.0.0",
        port: 9081,
        appTemplates: {},
    };

    private readonly importer: AppImporter;
    private readonly config: ServerConfig;
    private readonly server: Server;

    constructor(importer: AppImporter, config: Partial<ServerConfig> = {}) {
        this.importer = importer;
        this.config = { ...AppImportServer.DEFAULT_CONFIG, ...config };
        this.server = createServer(this.handleRequestSync);
    }

    public start(): Promise<this> {
        return new Promise(resolve => {
            this.server.listen(this.config.port, this.config.hostname, () => {
                resolve(this);
            });
        });
    }

    public get url() {
        const address = this.server.address();
        if (typeof address === "object" && address?.family === "IPv4") {
            return `http://${address.address}:${address.port}`;
        }
    }

    private handleRequestSync: RequestListener = (req, res) => {
        this.handleRequest(req, res).then(
            (result: unknown) => {
                const str = JSON.stringify(result);
                res.setHeader("content-type", "application/json");
                res.end(str, "utf8");
            },
            err => {
                if (res.statusCode === 200) {
                    res.statusCode = 500;
                }
                if (res.statusCode >= 500) {
                    console.error(err.stack);
                } else {
                    console.warn(err.message);
                }
                const str = JSON.stringify({ message: err.message });
                res.setHeader("content-type", "application/json");
                res.end(str, "utf8");
            },
        );
    };

    private async handleRequest(req: IncomingMessage, res: ServerResponse) {
        if (req.url !== "/") {
            res.statusCode = 400;
            throw new Error(`Unexpected path ${req.url}`);
        } else if (req.method === "GET") {
            return this.handleListApps();
        } else if (req.method === "POST") {
            return this.handleImportApp(req, res);
        } else {
            res.statusCode = 400;
            throw new Error("Bad request");
        }
    }

    private async handleListApps() {
        return Object.keys(this.config.appTemplates);
    }

    private async handleImportApp(req: IncomingMessage, res: ServerResponse) {
        const { appTemplates } = this.config;
        const body = await readJsonBody(req);
        if (typeof body === "object" && body !== null) {
            const { name, replacements } = body;
            if (typeof name === "string" && name in this.config.appTemplates) {
                const templatePath = appTemplates[name];
                return this.importer.importApp(
                    templatePath,
                    replacements as TemplateReplacements,
                );
            } else {
                res.statusCode = 400;
                const names = Object.keys(appTemplates).join(", ");
                throw new Error(`Unexpected app name (expected ${names})`);
            }
        } else {
            throw new Error("Expected a body object");
        }
    }
}
