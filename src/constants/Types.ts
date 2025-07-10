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

interface QuickBooksTelephoneNumber {
    FreeFormNumber?: string;
}

interface QuickBooksAddress {
    Id: string;
    PostalCode?: string;
    City?: string;
    Country?: string;
    Line5?: string;
    Line4?: string;
    Line3?: string;
    Line2?: string;
    Line1?: string;
    Lat?: string;
    Long?: string;
    CountrySubDivisionCode?: string;
}

interface QuickBooksEmailAddress {
    Address?: string;
}

// https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/customer#the-customer-object
interface QuickBooksCustomerDTO {
    Id: string;
    DisplayName?: string;
    Title?: string;
    GivenName?: string;
    MiddleName?: string;
    FamilyName?: string;
    Suffix?: string;
    PrimaryEmailAddr?: QuickBooksEmailAddress;
    Fax?: QuickBooksTelephoneNumber;
    CurrencyRef?: { value: string, name: string };
    Mobile?: QuickBooksTelephoneNumber;
    PrimaryPhone?: QuickBooksTelephoneNumber;
    AlternatePhone?: QuickBooksTelephoneNumber;
    ParentRef?: { value: string, name: string };
    Notes?: string;
    WebAddr?: { URI?: string };
    ShipAddr?: QuickBooksAddress;
    BillAddr?: QuickBooksAddress;
    PrimaryTaxIdentifier?: string;
    CompanyName?: string;
}

interface PaginateDataResponseType {
    paginate?: {
        data?: Record<string, unknown>[];
        display_field: string;
        primary_key: string;
    }
}

interface QuickBooksCompanyInfoDTO {
    Country?: string;
}

export type {
    ExchangeTokenRequestType,
    MigrateDataRequestType,
    TokenSchema,
    QuickBooksAccountDTO,
    QuickBooksCustomerDTO,
    PaginateDataResponseType,
    QuickBooksCompanyInfoDTO,
}