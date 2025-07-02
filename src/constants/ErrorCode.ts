enum ErrorCode {
    // general
    GENERAL_AUTHENTICATION_ERROR = 101,
    GENERAL_INCORRECT_PARAM = 102,
    UNKNOWN_ERROR = 103,
    UNAUTHORIZED_ACCESS = 105,
    // auth
    TOKEN_EXPIRED = 106,
    TOKEN_MISSING = 107,

}

export default ErrorCode;