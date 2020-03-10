import * as cp from "child_process";
import fetch from "node-fetch";
import * as path from "path";
import * as fs from "fs-extra";

export class MDBRealmWrapper {
    private static readonly APPS_DIRECTORY_PATH = path.resolve(
        __dirname,
        "../apps"
    );

    private readonly baseUrl: string;
    private readonly username: string;
    private readonly password: string;
    private readonly appName: string;
    private appId: string | undefined;
    private appPath: string | undefined;
    private readonly appTemplatePath: string;
    private readonly configPath = path.resolve(
        __dirname,
        "../stitch-cli-config.json"
    );

    private accessToken: string | undefined;

    constructor(
        baseUrl = "http://localhost:9090",
        username = "unique_user@domain.com",
        password = "password",
        appName = "my-test-app",
        appTemplatePath = path.resolve(__dirname, "../my-test-app-template")
    ) {
        this.baseUrl = baseUrl;
        this.username = username;
        this.password = password;
        this.appName = appName;
        this.appTemplatePath = appTemplatePath;
        this.cleanup();
    }

    public async importApp() {
        await this.checkSanity();
        await this.login();
        const groupId = await this.getGroupId();

        // Get or create an application
        const apps = await this.getApps(groupId);
        const testApps = apps.filter((app: any) => app.name === this.appName);
        if (testApps.length === 0) {
            const app = await this.createApp(groupId, this.appName);
            const appId = app.client_app_id;
            this.appId = appId;
            // Create any secrets
            await this.createSecret(
                groupId,
                app._id,
                "primary-secret-key",
                "2k66QfKeTRk3MdZ5vpDYgZCu2k66QfKeTRk3MdZ5vpDYgZCu"
            );
        } else if (testApps.length === 1) {
            const [app] = testApps;
            this.appId = app.client_app_id;
        } else if (testApps.length > 1) {
            throw new Error(`Expected at most one app named ${this.appName}`);
        }

        // Copy over the app template
        if (this.appId) {
            this.copyAppTemplate(this.appId);
        }

        const sharedParameters = [
            "--config-path",
            this.configPath,
            "--base-url",
            this.baseUrl
        ];

        // Login the user using the Stitch CLI
        this.stitchCli(
            "login",
            ...sharedParameters,
            "--auth-provider",
            "local-userpass",
            "--username",
            this.username,
            "--password",
            this.password
        );
        // Ensure we know who we are ...
        this.stitchCli("whoami", ...sharedParameters);
        // Import the app
        if (this.appPath) {
            this.stitchCli(
                "import",
                ...sharedParameters,
                "--app-name",
                this.appName,
                "--path",
                this.appPath,
                "--project-id",
                groupId,
                "--strategy",
                "replace",
                "--yes" // Bypass prompts
            );
        } else {
            throw new Error("Can't import before the app path is known");
        }
    }

    public cleanup() {
        // Delete any existing configuraiton
        if (fs.existsSync(this.configPath)) {
            fs.unlinkSync(this.configPath);
        }
    }

    public getBaseUrl() {
        return this.baseUrl;
    }

    public getAppId() {
        if (this.appId) {
            return this.appId;
        } else {
            throw new Error("App ID is unknown at this point in time");
        }
    }

    public copyAppTemplate(appId: string) {
        // Determine the path of the new app
        this.appPath = path.resolve(MDBRealmWrapper.APPS_DIRECTORY_PATH, appId);
        // Only copy over the template, if the app doesn't already exist
        if (!fs.existsSync(this.appPath)) {
            fs.mkdirpSync(this.appPath);
            fs.copySync(this.appTemplatePath, this.appPath, {
                recursive: true
            });
            // Update the app_id in the stitch.json configuration
            const stitchJsonPath = path.resolve(this.appPath, "stitch.json");
            const stitchJson = JSON.parse(
                fs.readFileSync(stitchJsonPath, { encoding: "utf8" })
            );
            stitchJson.app_id = appId;
            fs.writeFileSync(
                stitchJsonPath,
                JSON.stringify(stitchJson, null, 2),
                { encoding: "utf8" }
            );
        }
    }

    private stitchCli(...args: string[]) {
        cp.spawnSync("stitch-cli", args, { stdio: "inherit" });
    }

    private async checkSanity() {
        const url = `${this.baseUrl}/api/admin/v3.0/auth/providers`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Unexpected response from MongoDB Realm (${url})`);
        } else {
            const providers = await response.json();
            const userPassProvider = providers.find(
                (p: any) => p.type === "local-userpass"
            );
            if (!userPassProvider) {
                throw new Error(
                    "Expected server expose a 'local-userpass' authentication provider"
                );
            }
        }
    }

    private async login() {
        const url = `${this.baseUrl}/api/admin/v3.0/auth/providers/local-userpass/login`;
        const body = JSON.stringify({
            username: this.username,
            password: this.password
        });
        const response = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body
        });
        // Store the access and refresh tokens
        const responseBody = await response.json();
        this.accessToken = responseBody.access_token;
    }

    private async getProfile() {
        if (!this.accessToken) {
            throw new Error("Login before calling this method");
        }
        const url = `${this.baseUrl}/api/admin/v3.0/auth/profile`;
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${this.accessToken}` }
        });
        return response.json();
    }

    private async getGroupId() {
        const profile = await this.getProfile();
        if (typeof profile === "object" && profile.roles.length === 1) {
            return profile.roles[0].group_id;
        } else {
            throw new Error("Expected user to have a role in a single group");
        }
    }

    private async getApps(groupId: string) {
        if (!this.accessToken) {
            throw new Error("Login before calling this method");
        }
        const url = `${this.baseUrl}/api/admin/v3.0/groups/${groupId}/apps`;
        const response = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${this.accessToken}`
            }
        });
        return response.json();
    }

    private async createApp(groupId: string, name: string) {
        if (!this.accessToken) {
            throw new Error("Login before calling this method");
        }
        const url = `${this.baseUrl}/api/admin/v3.0/groups/${groupId}/apps`;
        const body = JSON.stringify({ name });
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                "content-type": "application/json"
            },
            body
        });
        return response.json();
    }

    private async createSecret(
        groupId: string,
        internalAppId: string,
        name: string,
        value: string
    ) {
        if (!this.accessToken) {
            throw new Error("Login before calling this method");
        }
        const url = `${this.baseUrl}/api/admin/v3.0/groups/${groupId}/apps/${internalAppId}/secrets`;
        const body = JSON.stringify({ name, value });
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                "content-type": "application/json"
            },
            body
        });
        if (response.ok) {
            return true;
        } else {
            return false;
        }
    }
}
