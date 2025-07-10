enum QuickBooksChartOfAccountType {
    BANK = "Bank",
    OTHER_CURRENT_ASSET = "Other Current Asset",
    FIXED_ASSET = "Fixed Asset",
    OTHER_ASSET = "Other Asset",
    ACCOUNTS_RECEIVABLE = "Accounts Receivable",
    EQUITY = "Equity",
    EXPENSE = "Expense",
    OTHER_EXPENSE = "Other Expense",
    COST_OF_GOODS_SOLD = "Cost of Goods Sold",
    ACCOUNTS_PAYABLE = "Accounts Payable",
    CREDIT_CARD = "Credit Card",
    LONG_TERM_LIABILITY = "Long Term Liability",
    OTHER_CURRENT_LIABILITY = "Other Current Liability",
    INCOME = "Income",
    OTHER_INCOME = "Other Income",
}

// enum FIYGEChartOfAccountID {
//     BANK = "Bank",
//     CURRENT_ASSETS = "Current Assets",
//     CAPITAL_ASSETS = "Capital Assets",
//     OTHER_ASSETS = "Other Assets",
//     ACCOUNTS_RECEIVABLE = "Accounts receivable (A/R)",
//     EQUITY = "Equity",
//     EXPENSE = "Expense",
//     OTHER_EXPENSE = "Other Expense",
//     COST_OF_GOODS_SOLD = "Cost of Goods Sold",
//     ACCOUNTS_PAYABLE = "Accounts Payable (A/P)",
//     CREDIT_CARD = "Credit Card",
//     LONG_TERM_LIABILITIES = "Long Term Liabilities",
//     CURRENT_LIABILITIES = "Current Liabilities",
//     INCOME = "Income",
//     OTHER_INCOME = "Other Income",
// }

enum FIYGEChartOfAccountID {
    BANK = "20",
    CURRENT_ASSETS = "29",
    CAPITAL_ASSETS = "25",
    OTHER_ASSETS = "28",
    ACCOUNTS_RECEIVABLE = "19",
    EQUITY = "23",
    EXPENSE = "24",
    OTHER_EXPENSE = "31",
    COST_OF_GOODS_SOLD = "21",
    ACCOUNTS_PAYABLE = "18",
    CREDIT_CARD = "22",
    LONG_TERM_LIABILITIES = "27",
    CURRENT_LIABILITIES = "30",
    INCOME = "26",
    OTHER_INCOME = "32",
}

enum FIYGEAddressType {
    MAILING = "795",
    SHIPPING = "796",
    OTHER = "797",
    OFFICE = "798",
    HOME_RESIDENTIAL = "799",
}

enum FIYGEEmailAddressType {
    PRIMARY = "801",
    SECONDARY = "802",
    ASSISTANT = "803",
    OTHER = "804",
    WORK = "805",
    OTHER_2 = "806",
}

enum FIYGEPhoneNumberType {
}

enum FIYGEPeopleType {
    CLIENT = "1",
}

enum FIYGEPeopleSubType {
    B2C_DIRECT_CLIENT = "9",
}

enum FIYGECompanyType {
    CLIENT = "1",
    SUPPLIER = "2",
    VENDOR = "3",
    PARTNER = "4",
    OTHER = "6",
    INTERNAL = "10",
}

export {
    QuickBooksChartOfAccountType,
    FIYGEChartOfAccountID,
    FIYGEAddressType,
    FIYGEEmailAddressType,
    FIYGEPhoneNumberType,
    FIYGEPeopleType,
    FIYGEPeopleSubType,
    FIYGECompanyType,
}