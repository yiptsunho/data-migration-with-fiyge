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
    QuickBooksAccountDTO, QuickBooksCompanyInfoDTO, QuickBooksCustomerDTO
} from "../constants/Types";
import axios, {AxiosError} from "axios";
import tokenModel from "../models/TokenModel";
import {QUICK_BOOKS_ACCOUNT_TYPE_MAP} from "../constants/Constant";
import {
    FIYGEAddressType,
    FIYGECompanyType,
    FIYGEEmailAddressType,
    FIYGEPeopleSubType,
    FIYGEPeopleType, FIYGEPhoneNumberType
} from "../constants/Enum";
import {bulkInsertIntoFiyge, getFIYGECountryList} from "../utils/Util";

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
                customerList,
                // supplierList,
                // employeeList,
                // journalEntryList,
                fiygeCountryData,
                companyInfo
            ] = await Promise.all([
                getChartOfAccounts(url, oauthClient, token.realmId),
                getChartOfAccountsFromFiyge(fiygeAccessToken),
                getCustomers(url, oauthClient, token.realmId),
                // getSuppliers(url, oauthClient, token.realmId),
                // getEmployees(url, oauthClient, token.realmId),
                // getJournalEntries(url, oauthClient, token.realmId),
                getFIYGECountryList(fiygeAccessToken),
                getCompanyInfo(url, oauthClient, token.realmId),
            ])


            // console.log("fiygeCountryData?.paginate?.data?.length", fiygeCountryData?.paginate?.data?.length)
            console.log("fiygeCountryData?.paginate?.data", fiygeCountryData?.paginate?.data?.[0])
            console.log("companyInfo", companyInfo)
            const fiygeCountryList = fiygeCountryData?.paginate?.data;
            const clientCountryCode = companyInfo?.Country;
            const clientCountry = clientCountryCode ? fiygeCountryList?.find(country => {
                if (clientCountryCode.length === 2) {
                    return clientCountryCode === country["countries.iso2"]
                }

                return clientCountryCode === country["countries.iso3"]
            }) : undefined;
            const clientCountryId = clientCountry?.["countries.id"] as string | undefined;
            // console.log("clientCountryCode", clientCountryCode)
            // console.log("clientCountry", clientCountry)
            // const
            // console.dir(fiygeCountryData, { depth: null })
            // contains the business logic of all data migration
            // console.log("Start migrating chart of accounts")
            // await migrateChartOfAccounts(accountList, fiygeAccountData, fiygeAccessToken);
            // console.log("End migrating chart of accounts")

            if (clientCountryId) {
                console.log("Start migrating customers")
                await migrateCustomers(clientCountryId, userId, fiygeCountryList, customerList, fiygeAccessToken);
                // const customersResponse = await getCustomers(url, oauthClient, token.realmId);
                console.log("End migrating customers")
            }
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

const getCustomers = async (url: string, oauthClient: OAuthClient, realmId: number) => {
    const query = encodeURIComponent("select * from Customer")
    const response = await oauthClient.makeApiCall({ url: url + 'v3/company/' + realmId +'/query?query=' + query})

    const result: QuickBooksCustomerDTO[] | undefined = response?.json?.QueryResponse.Customer;
    // console.log("getCustomers result: ", result);
    return result;
}

const getSuppliers = async (url: string, oauthClient: OAuthClient, realmId: number) => {
    const query = "select%20%2A%20from%20Vendor"
    const response = await oauthClient.makeApiCall({ url: url + 'v3/company/' + realmId +'/query?query=' + query})

    const result = response?.json?.QueryResponse.Vendor;
    // console.log("getSuppliers result: ", result);
    return result;
}

const getEmployees = async (url: string, oauthClient: OAuthClient, realmId: number) => {
    const query = "select%20%2A%20from%20Employee"
    const response = await oauthClient.makeApiCall({ url: url + 'v3/company/' + realmId +'/query?query=' + query})

    const result = response?.json?.QueryResponse.Employee;
    // console.log("getEmployees result: ", result);
    return result;
}

const getJournalEntries = async (url: string, oauthClient: OAuthClient, realmId: number) => {
    const query = "select%20%2A%20from%20JournalEntry"
    const response = await oauthClient.makeApiCall({ url: url + 'v3/company/' + realmId +'/query?query=' + query})

    const result = response?.json?.QueryResponse.JournalEntry;
    // console.log("getJournalEntries result: ", result);
    return result;
}

// get chart of accounts from FIYGE
const getChartOfAccountsFromFiyge = async (accessToken: string) => {
    const response = await axios.get<PaginateDataResponseType>(process.env.FIYGE_SERVER_URL + "/accounting/accounts/index.json?track_open=0", {
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

const migrateCustomers = async (clientCountryId: string, userId: string, fiygeCountryList: Record<string,unknown>[] | undefined, customerList: QuickBooksCustomerDTO[] | undefined, fiygeAccessToken: string) => {
    if (customerList === undefined) {
        throw new AppErr(
            StatusCodes.INTERNAL_SERVER_ERROR,
            "customerList === undefined",
            StatusCodes.INTERNAL_SERVER_ERROR,
        )
    }

    const peopleList = customerList.filter(customer => isPeople(customer))
    const companyList = customerList.filter(customer => !isPeople(customer))


    const peopleData = transformPeoples(clientCountryId, userId, fiygeCountryList, peopleList)
    const companyData = transformCompanies(clientCountryId, userId, fiygeCountryList, companyList)
    // console.log("peopleList", peopleList)
    console.log("peopleData", peopleData)
    // console.log("companyList", companyList)
    console.log("companyData", companyData)
    const peopleResponse = await bulkInsertIntoFiyge(fiygeAccessToken, "/crm/people/add_many.json", peopleData)
    const companyResponse = await bulkInsertIntoFiyge(fiygeAccessToken, "/crm/companies/add_many.json", companyData)
    // console.log("peopleResponse")
    // console.dir(peopleResponse, { depth: null })
    // console.log("companyResponse")
    // console.dir(companyResponse, { depth: null })
    console.log("peopleResponse", peopleResponse)
    console.log("companyResponse", companyResponse)
}

const transformChartOfAccounts = (data: QuickBooksAccountDTO[], quickBooksToFiygeAccountIdMap: Map<string, unknown>) => {
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

const transformPeoples = (countryId: string, userId: string, fiygeCountryList: Record<string,unknown>[] | undefined, data: QuickBooksCustomerDTO[]) => {
    const transformedData: Record<string, any> = {
        'data[normalized]': '1',
    };

    data.forEach((people, index) => {
        const {
            Title,
            GivenName,
            MiddleName,
            FamilyName,
            Suffix,
            PrimaryEmailAddr,
            Fax,
            CurrencyRef,
            Mobile,
            PrimaryPhone,
            AlternatePhone,
            ParentRef,
            Notes,
            WebAddr,
            ShipAddr,
            BillAddr,
            PrimaryTaxIdentifier,
        } = people;
        const prefix = `data[people][${index}]`;

        transformedData[`${prefix}[people_type_id]`] = FIYGEPeopleType.CLIENT;
        transformedData[`${prefix}[people_sub_type_id]`] = FIYGEPeopleSubType.B2C_DIRECT_CLIENT;
        transformedData[`${prefix}[owned_by]`] = userId;
        transformedData[`${prefix}[owned_by_model]`] = "owned_by_user";

        if (Title !== undefined) {
            transformedData[`${prefix}[__title_id]`] = Title;
        }

        if (GivenName !== undefined || MiddleName !== undefined) {
            const name = [GivenName, MiddleName].join(" ");
            transformedData[`${prefix}[first_name]`] = name.trim();
        }

        if (FamilyName !== undefined) {
            transformedData[`${prefix}[last_name]`] = FamilyName;
        }

        if (PrimaryEmailAddr?.Address !== undefined) {
            transformedData[`${prefix}[email_addresses][0][type]`] = FIYGEEmailAddressType.PRIMARY;
            transformedData[`${prefix}[email_addresses][0][email]`] = PrimaryEmailAddr?.Address;
        }

        if (PrimaryPhone?.FreeFormNumber !== undefined) {
            // TODO: add phone type "Primary" in FIYGE
            transformedData[`${prefix}[phone_numbers][0][type]`] = FIYGEPhoneNumberType.OFFICE;
            transformedData[`${prefix}[phone_numbers][0][number]`] = PrimaryPhone?.FreeFormNumber;
        }

        if (Mobile?.FreeFormNumber !== undefined) {
            transformedData[`${prefix}[phone_numbers][1][type]`] = FIYGEPhoneNumberType.MOBILE;
            transformedData[`${prefix}[phone_numbers][1][number]`] = Mobile?.FreeFormNumber;
        }

        if (AlternatePhone?.FreeFormNumber !== undefined) {
            transformedData[`${prefix}[phone_numbers][2][type]`] = FIYGEPhoneNumberType.OTHER;
            transformedData[`${prefix}[phone_numbers][2][number]`] = AlternatePhone?.FreeFormNumber;
        }

        if (Fax?.FreeFormNumber !== undefined) {
            transformedData[`${prefix}[phone_numbers][3][type]`] = FIYGEPhoneNumberType.FAX;
            transformedData[`${prefix}[phone_numbers][3][number]`] = Fax?.FreeFormNumber;
        }

        if (Notes !== undefined) {
            transformedData[`${prefix}[client_notes]`] = Notes;
        }

        if (ShipAddr !== undefined) {
            transformedData[`${prefix}[addresses][0][type]`] = FIYGEAddressType.SHIPPING;
            transformedData[`${prefix}[addresses][0][address_line_1]`] = ShipAddr?.Line1;
            transformedData[`${prefix}[addresses][0][city]`] = ShipAddr?.City;
            transformedData[`${prefix}[addresses][0][zip]`] = ShipAddr?.PostalCode;

            if (ShipAddr?.Line2 || ShipAddr?.Line3 || ShipAddr?.Line4 || ShipAddr?.Line5) {
                const addressLine2 = [ShipAddr?.Line2, ShipAddr?.Line3, ShipAddr?.Line4, ShipAddr?.Line5].join(" ")
                transformedData[`${prefix}[addresses][0][address_line_2]`] = addressLine2.trim();
            }

            if (ShipAddr?.Lat !== undefined && ShipAddr?.Lat !== "INVALID") {
                transformedData[`${prefix}[addresses][0][latitude]`] = ShipAddr?.Lat;
            }

            if (ShipAddr?.Long  !== undefined && ShipAddr?.Long !== "INVALID") {
                transformedData[`${prefix}[addresses][0][latitude]`] = ShipAddr?.Long;
            }

            if (ShipAddr?.Country !== undefined) {
                const country = findCountry(fiygeCountryList, ShipAddr?.Country)

                if (country !== undefined) {
                    transformedData[`${prefix}[addresses][0][country_id]`] = country["countries.id"];
                }
            } else {
                transformedData[`${prefix}[addresses][0][country_id]`] = countryId;
            }
        }

        if (BillAddr !== undefined) {
            // TODO: add address type "Billing" in FIYGE
            transformedData[`${prefix}[addresses][1][type]`] = FIYGEAddressType.OTHER;
            transformedData[`${prefix}[addresses][1][address_line_1]`] = BillAddr?.Line1;
            transformedData[`${prefix}[addresses][1][city]`] = BillAddr?.City;
            transformedData[`${prefix}[addresses][1][zip]`] = BillAddr?.PostalCode;

            if (BillAddr?.Line2 || BillAddr?.Line3 || BillAddr?.Line4 || BillAddr?.Line5) {
                const addressLine2 = [BillAddr?.Line2, BillAddr?.Line3, BillAddr?.Line4, BillAddr?.Line5].join(" ")
                transformedData[`${prefix}[addresses][1][address_line_2]`] = addressLine2.trim();
            }

            if (BillAddr?.Lat !== undefined && BillAddr?.Lat !== "INVALID") {
                transformedData[`${prefix}[addresses][1][latitude]`] = BillAddr?.Lat;
            }

            if (BillAddr?.Long  !== undefined && BillAddr?.Long !== "INVALID") {
                transformedData[`${prefix}[addresses][1][latitude]`] = BillAddr?.Long;
            }

            if (BillAddr?.Country !== undefined) {
                const country = findCountry(fiygeCountryList, BillAddr?.Country)

                if (country !== undefined) {
                    transformedData[`${prefix}[addresses][1][country_id]`] = country["countries.id"];
                }
            } else {
                transformedData[`${prefix}[addresses][1][country_id]`] = countryId;
            }
        }
    });

    return transformedData;
}

const transformCompanies = (countryId: string, userId: string, fiygeCountryList: Record<string,unknown>[] | undefined, data: QuickBooksCustomerDTO[]) => {
    const transformedData: Record<string, any> = {
        'data[normalized]': '1',
    };

    data.forEach((people, index) => {
        const {
            Title,
            DisplayName,
            GivenName,
            MiddleName,
            FamilyName,
            Suffix,
            PrimaryEmailAddr,
            Fax,
            CurrencyRef,
            Mobile,
            PrimaryPhone,
            AlternatePhone,
            ParentRef,
            Notes,
            WebAddr,
            ShipAddr,
            BillAddr,
            PrimaryTaxIdentifier,
        } = people;
        const prefix = `data[companies][${index}]`;

        transformedData[`${prefix}[company_type_id]`] = FIYGECompanyType.CLIENT;
        transformedData[`${prefix}[owned_by]`] = userId;
        transformedData[`${prefix}[owned_by_model]`] = "owned_by_user";

        if (DisplayName !== undefined) {
            transformedData[`${prefix}[name]`] = DisplayName;
        }

        if (PrimaryEmailAddr?.Address !== undefined) {
            transformedData[`${prefix}[email_addresses][0][type]`] = FIYGEEmailAddressType.PRIMARY;
            transformedData[`${prefix}[email_addresses][0][email]`] = PrimaryEmailAddr?.Address;
        }

        if (PrimaryPhone?.FreeFormNumber !== undefined) {
            // TODO: add phone type "Primary" in FIYGE
            transformedData[`${prefix}[phone_numbers][0][type]`] = FIYGEPhoneNumberType.OFFICE;
            transformedData[`${prefix}[phone_numbers][0][number]`] = PrimaryPhone?.FreeFormNumber;
        }

        if (Mobile?.FreeFormNumber !== undefined) {
            transformedData[`${prefix}[phone_numbers][1][type]`] = FIYGEPhoneNumberType.MOBILE;
            transformedData[`${prefix}[phone_numbers][1][number]`] = Mobile?.FreeFormNumber;
        }

        if (AlternatePhone?.FreeFormNumber !== undefined) {
            transformedData[`${prefix}[phone_numbers][2][type]`] = FIYGEPhoneNumberType.OFFICE;
            transformedData[`${prefix}[phone_numbers][2][number]`] = AlternatePhone?.FreeFormNumber;
        }

        if (Fax?.FreeFormNumber !== undefined) {
            transformedData[`${prefix}[phone_numbers][3][type]`] = FIYGEPhoneNumberType.OTHER;
            transformedData[`${prefix}[phone_numbers][3][number]`] = Fax?.FreeFormNumber;
        }

        if (Notes !== undefined) {
            transformedData[`${prefix}[description]`] = Notes;
        }

        if (ShipAddr !== undefined) {
            transformedData[`${prefix}[addresses][0][type]`] = FIYGEAddressType.SHIPPING;
            transformedData[`${prefix}[addresses][0][address_line_1]`] = ShipAddr?.Line1;
            transformedData[`${prefix}[addresses][0][city]`] = ShipAddr?.City;
            transformedData[`${prefix}[addresses][0][zip]`] = ShipAddr?.PostalCode;

            if (ShipAddr?.Line2 || ShipAddr?.Line3 || ShipAddr?.Line4 || ShipAddr?.Line5) {
                const addressLine2 = [ShipAddr?.Line2, ShipAddr?.Line3, ShipAddr?.Line4, ShipAddr?.Line5].join(" ")
                transformedData[`${prefix}[addresses][0][address_line_2]`] = addressLine2.trim();
            }

            if (ShipAddr?.Lat !== undefined && ShipAddr?.Lat !== "INVALID") {
                transformedData[`${prefix}[addresses][0][latitude]`] = ShipAddr?.Lat;
            }

            if (ShipAddr?.Long  !== undefined && ShipAddr?.Long !== "INVALID") {
                transformedData[`${prefix}[addresses][0][latitude]`] = ShipAddr?.Long;
            }

            if (ShipAddr?.Country !== undefined) {
                const country = findCountry(fiygeCountryList, ShipAddr?.Country)

                if (country !== undefined) {
                    transformedData[`${prefix}[addresses][0][__country_id]`] = country["countries.id"];
                }
            } else {
                transformedData[`${prefix}[addresses][0][country_id]`] = countryId;
            }
        }

        if (BillAddr !== undefined) {
            // TODO: add address type "Billing" in FIYGE
            transformedData[`${prefix}[addresses][1][type]`] = FIYGEAddressType.OTHER;
            transformedData[`${prefix}[addresses][1][address_line_1]`] = BillAddr?.Line1;
            transformedData[`${prefix}[addresses][1][city]`] = BillAddr?.City;
            transformedData[`${prefix}[addresses][1][zip]`] = BillAddr?.PostalCode;

            if (BillAddr?.Line2 || BillAddr?.Line3 || BillAddr?.Line4 || BillAddr?.Line5) {
                const addressLine2 = [BillAddr?.Line2, BillAddr?.Line3, BillAddr?.Line4, BillAddr?.Line5].join(" ")
                transformedData[`${prefix}[addresses][1][address_line_2]`] = addressLine2.trim();
            }

            if (BillAddr?.Lat !== undefined && BillAddr?.Lat !== "INVALID") {
                transformedData[`${prefix}[addresses][1][latitude]`] = BillAddr?.Lat;
            }

            if (BillAddr?.Long  !== undefined && BillAddr?.Long !== "INVALID") {
                transformedData[`${prefix}[addresses][1][latitude]`] = BillAddr?.Long;
            }

            if (BillAddr?.Country !== undefined) {
                const country = findCountry(fiygeCountryList, BillAddr?.Country)

                if (country !== undefined) {
                    transformedData[`${prefix}[addresses][1][__country_id]`] = country["countries.id"];
                }
            } else {
                transformedData[`${prefix}[addresses][1][country_id]`] = countryId;
            }
        }
    });

    return transformedData;
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

const isPeople = (customer: QuickBooksCustomerDTO) => {
    const {Title, GivenName, MiddleName, FamilyName, Suffix, DisplayName, CompanyName} = customer;
    const peopleName = [Title, GivenName, MiddleName, FamilyName, Suffix].join(" ").replace("  ", " ").trim()
    // console.log("peopleName", peopleName)
    if (DisplayName === peopleName) {
        return true;
    }

    // if (DisplayName === CompanyName) {
    //     return false;
    // }

    return false;
}

const getCompanyInfo = async (url: string, oauthClient: OAuthClient, realmId: number) => {
    // const query = encodeURIComponent("select * from CompanyInfo")
    const response = await oauthClient.makeApiCall({url: url + 'v3/company/' + realmId + '/companyinfo/' + realmId})

    console.log("json", response?.json)
    const result: QuickBooksCompanyInfoDTO | undefined = response?.json?.CompanyInfo;
    // console.log("getCustomers result: ", result);
    return result;
}

const findCountry = (fiygeCountryList: Record<string, unknown>[] | undefined, freeText: string) => {
    return fiygeCountryList?.find(country => {
        const countryName = country?.["countries.country_name"] as string | undefined;
        const iso3 = country?.["countries.iso3"] as string | undefined;
        const iso2 = country?.["countries.iso2"] as string | undefined;

        return countryName?.toLowerCase() === freeText.toLowerCase() || iso3?.toLowerCase() === freeText.toLowerCase() || iso2?.toLowerCase() === freeText.toLowerCase()
    })
}

export default QuickBooksService;