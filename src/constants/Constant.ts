import {FIYGEChartOfAccountID, QuickBooksChartOfAccountType} from "./Enum";

export const QUICK_BOOKS_ACCOUNT_TYPE_MAP: Record<QuickBooksChartOfAccountType, FIYGEChartOfAccountID> = {
    [QuickBooksChartOfAccountType.BANK]: FIYGEChartOfAccountID.BANK,
    [QuickBooksChartOfAccountType.OTHER_CURRENT_ASSET]: FIYGEChartOfAccountID.CURRENT_ASSETS,
    [QuickBooksChartOfAccountType.FIXED_ASSET]: FIYGEChartOfAccountID.CAPITAL_ASSETS,
    [QuickBooksChartOfAccountType.OTHER_ASSET]: FIYGEChartOfAccountID.OTHER_ASSETS,
    [QuickBooksChartOfAccountType.ACCOUNTS_RECEIVABLE]: FIYGEChartOfAccountID.ACCOUNTS_RECEIVABLE,
    [QuickBooksChartOfAccountType.EQUITY]: FIYGEChartOfAccountID.EQUITY,
    [QuickBooksChartOfAccountType.EXPENSE]: FIYGEChartOfAccountID.EXPENSE,
    [QuickBooksChartOfAccountType.OTHER_EXPENSE]: FIYGEChartOfAccountID.OTHER_EXPENSE,
    [QuickBooksChartOfAccountType.COST_OF_GOODS_SOLD]: FIYGEChartOfAccountID.COST_OF_GOODS_SOLD,
    [QuickBooksChartOfAccountType.ACCOUNTS_PAYABLE]: FIYGEChartOfAccountID.ACCOUNTS_PAYABLE,
    [QuickBooksChartOfAccountType.CREDIT_CARD]: FIYGEChartOfAccountID.CREDIT_CARD,
    [QuickBooksChartOfAccountType.LONG_TERM_LIABILITY]: FIYGEChartOfAccountID.LONG_TERM_LIABILITIES,
    [QuickBooksChartOfAccountType.OTHER_CURRENT_LIABILITY]: FIYGEChartOfAccountID.CURRENT_LIABILITIES,
    [QuickBooksChartOfAccountType.INCOME]: FIYGEChartOfAccountID.INCOME,
    [QuickBooksChartOfAccountType.OTHER_INCOME]: FIYGEChartOfAccountID.OTHER_INCOME,
};
