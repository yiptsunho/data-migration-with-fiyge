// @ts-ignore
import OAuthClient from "intuit-oauth";
import {Express} from "express";

interface CreateOAuthClientType {
    redirectUri: string;
}

// Interface for session data (extend express-session types)
interface OAuthSession extends Express {
    oauthClientConfig?: CreateOAuthClientType;
    oauthToken?: {
        access_token: string;
        refresh_token: string;
        token_type: string;
        expires_in: number;
        x_refresh_token_expires_in: number;
        realmId: string;
    };
    realmId?: string;
}

class OAuthService {
    static createClient(config: CreateOAuthClientType): OAuthClient {
        // TODO: make environment dynamic
        return new OAuthClient({
            clientId: process.env.QUICK_BOOKS_CLIENT_ID,
            clientSecret: process.env.QUICK_BOOKS_CLIENT_SECRET,
            environment: "sandbox",
            redirectUri: config.redirectUri,
        });
    }
}

export default OAuthService;