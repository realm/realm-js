/**
 * First level keys are file globs and the values are objects that are spread over the content of the files matching the glob.
 * @example { "config.json": { name: "overridden-name" }, "services/local-mongodb/rules/*.json": { database: "another-database" } }
 */
export declare type TemplateReplacements = Record<string, Record<string, unknown>>;
export declare type Credentials = {
    kind: "api-key";
    publicKey: string;
    privateKey: string;
} | {
    kind: "username-password";
    username: string;
    password: string;
};
export interface AppImporterOptions {
    baseUrl: string;
    credentials: Credentials;
    realmConfigPath: string;
    appsDirectoryPath: string;
    cleanUp?: boolean;
}
export declare class AppImporter {
    private readonly baseUrl;
    private readonly credentials;
    private readonly realmConfigPath;
    private readonly appsDirectoryPath;
    private accessToken;
    constructor({ baseUrl, credentials, realmConfigPath, appsDirectoryPath, cleanUp }: AppImporterOptions);
    /**
     * @param appTemplatePath The path to a template directory containing the configuration files needed to import the app.
     * @param replacements An object with file globs as keys and a replacement object as values. Allows for just-in-time replacements of configuration parameters.
     * @returns A promise of an object containing the app id.
     */
    importApp(appTemplatePath: string, replacements?: TemplateReplacements): Promise<{
        appId: string;
    }>;
    deleteApp(clientAppId: string): Promise<void>;
    private get apiUrl();
    private loadJson;
    private loadAppConfigJson;
    private loadSecretsJson;
    private copyAppTemplate;
    private applyReplacements;
    private enableDevelopmentMode;
    private configureServiceFromAppPath;
    private configureAuthProvidersFromAppPath;
    private applyAppConfiguration;
    private performLogIn;
    private logIn;
    private saveStitchConfig;
    private getProfile;
    private getGroupId;
    private getAppByClientAppId;
    private findApp;
    private createApp;
    private createSecret;
}
