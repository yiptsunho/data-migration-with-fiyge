// @ts-ignore
import OAuthClient from "intuit-oauth";
import AppErr from "../errors/AppErr";
import ErrorMessage from "../constants/ErrorMessage";
import {ReasonPhrases, StatusCodes} from "http-status-codes";
import ErrorCode from "../constants/ErrorCode";
import OAuthService from "../clients/Client";
import {Request} from "express";
import {
    ExchangeTokenRequestType,
    MigrateDataRequestType,
    PaginateDataResponseType,
    QuickBooksAccountDTO
} from "../constants/Types";
import axios, {AxiosError} from "axios";
import tokenModel from "../models/TokenModel";
import {QUICK_BOOKS_ACCOUNT_TYPE_MAP} from "../constants/Constant";

const QuickBooksService = {
    exchangeToken: async (req: Request<{}, {}, ExchangeTokenRequestType>) => {
        const redirectUri = req.body.redirectUri;
        const url = req.body.url;
        const userId = req.body.userId;
        if (!redirectUri || !url || !userId) {
            throw new AppErr(
                ErrorCode.GENERAL_INCORRECT_PARAM,
                [ErrorMessage.REDIRECT_URI_MANDATORY, ErrorMessage.URL_MANDATORY, ErrorMessage.USER_ID_MANDATORY].join(","),
                StatusCodes.BAD_REQUEST
            );
        }

        // @ts-ignore
        const oauthClient = OAuthService.createClient({ redirectUri: redirectUri });
        const response = await oauthClient.createToken(url)
        const { token } = response;

        const now = new Date();
        const expireDateTime = new Date(now.getTime() + token.expires_in * 1000);
        const refreshTokenExpireDateTime = new Date(now.getTime() + token.x_refresh_token_expires_in * 1000);

        try {
            const existingToken = await tokenModel.findOne({ where: { userId, realmId: token.realmId } });
            if (!existingToken) {
                // insert new token
                const newToken = await tokenModel.create({
                    userId: Number(userId),
                    realmId: token.realmId,
                    accessToken: token.access_token,
                    refreshToken: token.refresh_token,
                    tokenType: token.token_type,
                    expireDateTime,
                    refreshTokenExpireDateTime,
                })
                console.log("newToken", newToken)
            } else {
                // update existing token
                existingToken.accessToken = token.access_token;
                existingToken.refreshToken = token.refresh_token;
                existingToken.tokenType = token.token_type;
                existingToken.expireDateTime = expireDateTime;
                existingToken.refreshTokenExpireDateTime = refreshTokenExpireDateTime;
                await existingToken.save();
            }
        } catch (err) {
            console.error(err);
            throw new AppErr(ErrorCode.UNKNOWN_ERROR, ErrorMessage.UNKNOWN_ERROR, StatusCodes.INTERNAL_SERVER_ERROR);
        }


        return token;
    },
    migrateData: async (req: Request<{}, {}, MigrateDataRequestType>) => {
        const { userId, realmId, fiygeAccessToken, redirectUri } = req.body;
        if (!fiygeAccessToken || !redirectUri || !userId || !realmId) {
            throw new AppErr(
                ErrorCode.GENERAL_INCORRECT_PARAM,
                [ErrorMessage.ACCESS_TOKEN_MANDATORY, ErrorMessage.REDIRECT_URI_MANDATORY, ErrorMessage.USER_ID_MANDATORY, ErrorMessage.REALM_ID_MANDATORY].join(", "),
                StatusCodes.BAD_REQUEST
            );
        }

        const token = await tokenModel.findOne({ where: { userId, realmId } })
        if (!token) {
            throw new AppErr(
                ErrorCode.TOKEN_MISSING,
                ErrorMessage.TOKEN_MISSING,
                StatusCodes.BAD_REQUEST,
            );
        }

        // TODO: no need to check, refresh token when access token is expired
        // Check if refresh token is expired
        if (token.refreshTokenExpireDateTime < new Date()) {
            throw new AppErr(
                ErrorCode.TOKEN_EXPIRED,
                ErrorMessage.TOKEN_EXPIRED,
                StatusCodes.BAD_REQUEST
            );
        }

        const oauthClient = OAuthService.createClient({ redirectUri: redirectUri });
        oauthClient.setToken({
            access_token: token.accessToken,
            refresh_token: token.refreshToken,
            token_type: token.tokenType,
            realmId: token.realmId,
        });

        // TODO: make environment dynamic
        // const url = environment == 'sandbox' ? OAuthClient.environment.sandbox : OAuthClient.environment.production ;
        const url = OAuthClient.environment.sandbox

        try {
            // const response = await oauthClient.makeApiCall({ url: url + 'v3/company/' + token.realmId +'/query?query=' + query})
            const [
                accountList,
                fiygeAccountData,
                // customerList,
                // supplierList,
                // employeeList,
                // journalEntryList
            ] = await Promise.all([
                getChartOfAccounts(url, oauthClient, token.realmId),
                getChartOfAccountsFromFiyge(fiygeAccessToken),
                // getCustomers(url, oauthClient, token.realmId),
                // getSuppliers(url, oauthClient, token.realmId),
                // getEmployees(url, oauthClient, token.realmId),
                // getJournalEntries(url, oauthClient, token.realmId),
            ])



            // contains the business logic of all data migration
            console.log("Start migrating chart of accounts")
            await migrateChartOfAccounts(accountList, fiygeAccountData, fiygeAccessToken);
            console.log("End migrating chart of accounts")

            // console.log("Start migrating customers")
            // const customersResponse = await getCustomers(url, oauthClient, token.realmId);
            // console.log("End migrating customers", customersResponse)
            //
            // console.log("Start migrating suppliers")
            // const suppliersResponse = await getSuppliers(url, oauthClient, token.realmId);
            // console.log("End migrating suppliers", suppliersResponse)
            //
            // console.log("Start migrating employees")
            // const employeesResponse = await getEmployees(url, oauthClient, token.realmId);
            // console.log("End migrating employees", employeesResponse)
            //
            // console.log("Start migrating journal entries")
            // const journalEntriesResponse = await getJournalEntries(url, oauthClient, token.realmId);
            // console.log("End migrating journal entries", journalEntriesResponse)

            return ReasonPhrases.OK;
        } catch (err) {
            // TODO: edge case: cater unauthorized error where the access token expires or the refresh token expires
            const accessTokenExpire = err instanceof AxiosError && err.response?.status === 401
            if (accessTokenExpire) {

            }
            console.error("debug err: ", err);
            // if (axios && err. === 404) {}
            throw new AppErr(ErrorCode.UNKNOWN_ERROR, ErrorMessage.UNKNOWN_ERROR, StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
}

// simple query in QuickBooks to get chart of accounts
const getChartOfAccounts = async (url: string, oauthClient: OAuthClient, realmId: number) => {
    const query = encodeURIComponent("select * from Account")
    const response = await oauthClient.makeApiCall({ url: url + 'v3/company/' + realmId +'/query?query=' + query})

    const result: QuickBooksAccountDTO[] | undefined = response?.json?.QueryResponse?.Account;
    return result;
}

// get chart of accounts from FIYGE
const getChartOfAccountsFromFiyge = async (accessToken: string) => {
    const response = await axios.get<PaginateDataResponseType>("https://api.accounting.fiyge.com/accounting/accounts/index.json?track_open=0", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        }
    })

    return response.data;
}

const migrateChartOfAccounts = async (quickBooksAccountList: QuickBooksAccountDTO[] | undefined, paginateData: PaginateDataResponseType, fiygeAccessToken: string) => {
    // 0. Validate all required data are not undefined, if not throw error
    const fiygeAccountList = paginateData.paginate?.data
    const displayField = paginateData.paginate?.display_field;
    const primaryKey = paginateData.paginate?.primary_key;

    if (fiygeAccountList === undefined || displayField === undefined || quickBooksAccountList === undefined || primaryKey === undefined) {
        throw new AppErr(
            StatusCodes.INTERNAL_SERVER_ERROR,
            "fiygeAccountList === undefined || displayField === undefined || quickBooksAccountList === undefined || primaryKey === undefined",
            StatusCodes.INTERNAL_SERVER_ERROR,
        )
    }


    // 1. Filter accounts that need to be created (a.k.a. does not exist in FIYGE), the comparison is based on account name
    // console.time("transforming")
    const fiygeAccountSet = new Set(fiygeAccountList.map(account => (account[displayField] as string).toLowerCase()));
    const accountListToBeCreated = quickBooksAccountList.filter(account => !fiygeAccountSet.has(account.Name.toLowerCase()))
    // console.timeEnd("transforming")
    // console.log("accountListToBeCreated", accountListToBeCreated)
    // console.log("fiygeAccountSet", [...fiygeAccountSet]);
    // console.log("quickBooksAccountList", quickBooksAccountList.map(account => account.Name));
    // console.log("accountListToBeCreated", accountListToBeCreated.map(account => account.Name));

    // 2. Construct a map based on the priority of accounts to be created,first level are the top most parent accounts where they do not have a parent account, second level are the accounts where their parent account is in the first level, etc.
    const levels = computeAccountLevels(quickBooksAccountList);
    const accountsByLevel = new Map<number, QuickBooksAccountDTO[]>();
    accountListToBeCreated.forEach((account) => {
        const level = levels.get(account.Id)!;
        if (!accountsByLevel.has(level)) {
            accountsByLevel.set(level, []);
        }
        accountsByLevel.get(level)!.push(account);
    });
    console.dir(accountsByLevel, { depth: null })

    // 3. Construct a map for conversion of QuickBooks account id to FIYGE account id, for accounts with a parent account
    const fiygeAccountMap = new Map<string, Record<string, unknown>>(fiygeAccountList.map(account => [(account[displayField] as string).toLowerCase(), account]));
    const quickBooksToFiygeAccountIdMap = new Map<string, unknown>(quickBooksAccountList.filter(account => fiygeAccountSet.has(account.Name.toLowerCase())).map(account => [account.Id, fiygeAccountMap.get(account.Name.toLowerCase())?.[primaryKey]]));

    // 4. Create chart of accounts in FIYGE, and add the mapping of QuickBooks account id to FIYGE account id of the newly created accounts at the end of each iteration
    // for (let level = 0; level < 1; level++) {
    for (let level = 0; accountsByLevel.has(level); level++) {
        const accounts = accountsByLevel.get(level);
        if (accounts === undefined) {
            break;
        }

        // transform data to x-www-form-urlencoded format
        const data = transformChartOfAccounts(accounts, quickBooksToFiygeAccountIdMap)
        // console.log("data", data)
        const response = await bulkInsertIntoFiyge(fiygeAccessToken, "/accounting/accounts/add_many.json", data)

        // add the mapping of QuickBooks account id to FIYGE account id of the newly created accounts
        const newCreatedAccounts: Record<string, unknown>[] = response.data.data?.accounts
        // console.log("newCreatedAccounts", newCreatedAccounts)
        const newCreatedFiygeAccountMap = new Map<unknown, unknown>(newCreatedAccounts.map(account => [(account.name as string).toLowerCase(), account.id]));
        // for (const [key, value] of newCreatedFiygeAccountMap) {
        //     console.log(`${key}, ${value}`)
        // }
        for (const account of accounts) {
            quickBooksToFiygeAccountIdMap.set(account.Id, newCreatedFiygeAccountMap.get(account.Name.toLowerCase()));
        }
    }
}

const getCustomers = async (url: string, oauthClient: OAuthClient, realmId: number) => {
    const query = "select%20%2A%20from%20Customer"
    const response = await oauthClient.makeApiCall({ url: url + 'v3/company/' + realmId +'/query?query=' + query})

    const result = response?.json?.QueryResponse.Customer;
    console.log("getCustomers result: ", result);
    return result;
}

const getSuppliers = async (url: string, oauthClient: OAuthClient, realmId: number) => {
    const query = "select%20%2A%20from%20Vendor"
    const response = await oauthClient.makeApiCall({ url: url + 'v3/company/' + realmId +'/query?query=' + query})

    const result = response?.json?.QueryResponse.Vendor;
    console.log("getSuppliers result: ", result);
    return result;
}

const getEmployees = async (url: string, oauthClient: OAuthClient, realmId: number) => {
    const query = "select%20%2A%20from%20Employee"
    const response = await oauthClient.makeApiCall({ url: url + 'v3/company/' + realmId +'/query?query=' + query})

    const result = response?.json?.QueryResponse.Employee;
    console.log("getEmployees result: ", result);
    return result;
}

const getJournalEntries = async (url: string, oauthClient: OAuthClient, realmId: number) => {
    const query = "select%20%2A%20from%20JournalEntry"
    const response = await oauthClient.makeApiCall({ url: url + 'v3/company/' + realmId +'/query?query=' + query})

    const result = response?.json?.QueryResponse.JournalEntry;
    console.log("getJournalEntries result: ", result);
    return result;
}

const transformChartOfAccounts = (data: QuickBooksAccountDTO[] | undefined, quickBooksToFiygeAccountIdMap: Map<string, unknown>) => {
    if (!data) {
        return {};
    }

    // const transformedData = new Map<string, unknown>();
    // transformedData.set("data[normalized]", "1")
    const transformedData: Record<string, any> = {
        'data[normalized]': '1',
    };

    data.forEach((account, index) => {
        const { Name, AcctNum, AccountType, ParentRef, Description, CurrencyRef } = account;
        const prefix = `data[accounts][${index}]`;

        // transformedData.set(`${prefix}[name]`, Name)
        // transformedData.set(`${prefix}[internal_type_id]`, 2)
        transformedData[`${prefix}[name]`] = Name;
        transformedData[`${prefix}[internal_type_id]`] = 2;

        if (AcctNum !== undefined) {
            // transformedData.set(`${prefix}[account_code]`, AcctNum)
            transformedData[`${prefix}[account_code]`] = AcctNum;
        }

        const fiygeAccountType = QUICK_BOOKS_ACCOUNT_TYPE_MAP[AccountType];
        if (fiygeAccountType !== undefined) {
            // transformedData.set(`${prefix}[__account_type_id]`, fiygeAccountType)
            transformedData[`${prefix}[account_type_id]`] = fiygeAccountType;
        }

        if (ParentRef !== undefined) {
            const fiygeParentAccountId = quickBooksToFiygeAccountIdMap.get(ParentRef.value)
            if (fiygeParentAccountId !== undefined) {
                // transformedData.set(`${prefix}[parent_id]`, ParentRef.value)
                transformedData[`${prefix}[parent_id]`] = fiygeParentAccountId;
            }
        }

        if (Description !== undefined) {
            // transformedData.set(`${prefix}[description]`, Description)
            transformedData[`${prefix}[description]`] = Description;
        }
    });

    return transformedData;
}

const bulkInsertIntoFiyge = async (accessToken: string, endPoint: string, data: Record<string, any>) => {
    const fiygeUrl = process.env.FIYGE_SERVER_URL + endPoint;
    const formData = new URLSearchParams(data);

    return await axios.post(fiygeUrl, formData, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${accessToken}`,
        },
    });
}

// Compute account levels (0 for top-level, 1 for children of level 0, etc.)
function computeAccountLevels(accounts: QuickBooksAccountDTO[]): Map<string, number> {
    const accountMap = new Map<string, QuickBooksAccountDTO>();
    const levels = new Map<string, number>();
    const visited = new Set<string>();
    const stack = new Set<string>(); // For cycle detection

    accounts.forEach((account) => {
        accountMap.set(account.Id, account);
        levels.set(account.Id, -1); // Initialize as uncomputed
    });

    function computeLevel(accountId: string): number {
        if (levels.get(accountId)! >= 0) {
            return levels.get(accountId)!;
        }

        if (stack.has(accountId)) {
            throw new AppErr(
                ErrorCode.GENERAL_INCORRECT_PARAM,
                `Cycle detected involving account ID ${accountId}`,
                StatusCodes.BAD_REQUEST
            );
        }

        stack.add(accountId);

        const account = accountMap.get(accountId)!;
        if (!account.SubAccount || !account.ParentRef?.value) {
            levels.set(accountId, 0); // Top-level account
        } else {
            const parentId = account.ParentRef.value;
            if (!accountMap.has(parentId)) {
                throw new AppErr(
                    ErrorCode.GENERAL_INCORRECT_PARAM,
                    `Parent account with ID ${parentId} not found for account ${account.Name}`,
                    StatusCodes.BAD_REQUEST
                );
            }
            const parentLevel = computeLevel(parentId);
            levels.set(accountId, parentLevel + 1);
        }

        stack.delete(accountId);
        visited.add(accountId);
        return levels.get(accountId)!;
    }

    accounts.forEach((account) => {
        if (!visited.has(account.Id)) {
            computeLevel(account.Id);
        }
    });

    return levels;
}

export default QuickBooksService;