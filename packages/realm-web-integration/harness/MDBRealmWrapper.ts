import * as cp from "child_process";
import fetch from "node-fetch";
import * as path from "path";
import * as fs from "fs";

export class MDBRealmWrapper {
    private readonly baseUrl: string;
    private readonly username: string;
    private readonly password: string;
    private readonly appName: string;
    private readonly appPath: string;
    private readonly configPath: string = path.resolve(
        __dirname,
        "../stitch-cli-config.json"
    );

    private accessToken: string | undefined;
    private refreshToken: string | undefined;

    constructor(
        baseUrl = "http://localhost:9090",
        username = "unique_user@domain.com",
        password = "password",
        appName = "my-test-app",
        appPath = path.resolve(__dirname, "../my-test-app")
    ) {
        this.baseUrl = baseUrl;
        this.username = username;
        this.password = password;
        this.appName = appName;
        this.appPath = appPath;
        this.cleanup();
    }

    public async importApp() {
        await this.checkSanity();
        await this.login();
        const groupId = await this.getGroupId();
        // Login the user using the Stitch CLI
        this.stitchCli(
            "login",
            "--config-path",
            this.configPath,
            "--base-url",
            this.baseUrl,
            "--auth-provider",
            "local-userpass",
            "--username",
            this.username,
            "--password",
            this.password
        );
        // Ensure we know who we are ...
        this.stitchCli("whoami", "--config-path", this.configPath);
        // Import the app
        this.stitchCli(
            "import",
            "--config-path",
            this.configPath,
            "--base-url",
            this.baseUrl,
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
        const appConfigPath = path.resolve(this.appPath, "stitch.json");
        const stitchConfig = fs.readFileSync(appConfigPath, {
            encoding: "utf8"
        });
        const parsedStitchConfig = JSON.parse(stitchConfig);
        return parsedStitchConfig.app_id;
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
        this.refreshToken = responseBody.refresh_token;
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
}
