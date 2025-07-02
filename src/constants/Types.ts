import {QuickBooksChartOfAccountType} from "./Enum";

interface GetAuthUriRequestType {
    redirectUri: string | null | undefined;
}

interface ExchangeTokenRequestType {
    userId: string | null | undefined;
    redirectUri: string | null | undefined;
    url: string | null | undefined;
}

interface MigrateDataRequestType {
    userId: string | null | undefined;
    realmId: string | null | undefined;
    fiygeAccessToken: string | null | undefined;
    redirectUri: string | null | undefined;
}

// Interface for token data stored in MySQL
interface TokenSchema {
    id: number;
    user_id: string;
    realm_id: string;
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_date_time: Date;
    refresh_token_expire_date_time: Date;
    created_at: Date;
    updated_at: Date;
}

// https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account#the-account-object
interface QuickBooksAccountDTO {
    Id: string;
    Name: string;
    AcctNum?: string;
    AccountType: QuickBooksChartOfAccountType;
    ParentRef?: { value: string, name: string };
    Description?: string;
    CurrencyRef?: { value: string, name: string };
    SubAccount: boolean;
}

interface PaginateDataResponseType {
    paginate?: {
        data?: Record<string, unknown>[];
        display_field: string;
        primary_key: string;
    }
}

export type {
    ExchangeTokenRequestType,
    MigrateDataRequestType,
    TokenSchema,
    QuickBooksAccountDTO,
    PaginateDataResponseType
}