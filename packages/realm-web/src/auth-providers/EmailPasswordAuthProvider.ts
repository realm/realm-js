import { Transport } from "../transports";

/** @inheritdoc */
export class EmailPasswordAuthProvider
    implements Realm.AuthProviders.EmailPasswordAuthProvider {
    /**
     * The underlying transport.
     */
    private readonly transport: Transport;

    /**
     * Construct an interface to the email / password authentication provider.
     *
     * @param transport The underlying transport used to request the services.
     * @param providerName Optional custom name of the authentication provider.
     */
    constructor(transport: Transport, providerName = "local-userpass") {
        this.transport = transport.prefix(`/auth/providers/${providerName}`);
    }

    /** @inheritdoc */
    registerUser(email: string, password: string): Promise<void> {
        return this.transport.fetch({
            method: "POST",
            path: "/register",
            body: { email, password },
        });
    }

    /** @inheritdoc */
    confirmUser(token: string, tokenId: string): Promise<void> {
        return this.transport.fetch({
            method: "POST",
            path: "/confirm",
            body: { token, tokenId },
        });
    }

    /** @inheritdoc */
    resendConfirmation(email: string): Promise<void> {
        return this.transport.fetch({
            method: "POST",
            path: "/confirm/send",
            body: { email },
        });
    }

    /** @inheritdoc */
    resetPassword(
        token: string,
        tokenId: string,
        password: string,
    ): Promise<void> {
        return this.transport.fetch({
            method: "POST",
            path: "/reset",
            body: { token, tokenId, password },
        });
    }

    /** @inheritdoc */
    sendResetPasswordEmail(email: string): Promise<void> {
        return this.transport.fetch({
            method: "POST",
            path: "/reset/send",
            body: { email },
        });
    }

    /** @inheritdoc */
    callResetPasswordFunction(
        email: string,
        password: string,
        args: any[],
    ): Promise<void> {
        return this.transport.fetch({
            method: "POST",
            path: "/reset/call",
            body: { email, password, arguments: args },
        });
    }
}
