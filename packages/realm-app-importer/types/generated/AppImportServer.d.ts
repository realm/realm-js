import { AppImporter } from "./AppImporter";
export declare type AppTemplates = Record<string, string>;
export declare type ServerConfig = {
    hostname?: string;
    port: number;
    /** Templates available for importing */
    appTemplates: AppTemplates;
};
export declare class AppImportServer {
    private static DEFAULT_CONFIG;
    private readonly importer;
    private readonly config;
    private readonly server;
    constructor(importer: AppImporter, config?: Partial<ServerConfig>);
    start(): Promise<this>;
    get url(): string | undefined;
    private handleRequestSync;
    private handleRequest;
    private handleListApps;
    private handleImportApp;
    private handleDeleteApp;
}
