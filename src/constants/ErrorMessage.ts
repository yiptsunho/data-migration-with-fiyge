enum ErrorMessage {
    // general
    ID_DOES_NOT_EXIST = "Id does not exist",
    UNKNOWN_ERROR = "Unknown error",
    UNAUTHORIZED_ACCESS = "unauthorized access",
    // auth
    REDIRECT_URI_MANDATORY = "redirectUri is mandatory",
    ACCESS_TOKEN_MANDATORY = "fiygeAccessToken is mandatory",
    TOKEN_EXPIRED = "Token expired",
    TOKEN_MISSING = "Token is missing",
    URL_MANDATORY = "url is mandatory",
    USER_ID_MANDATORY = "userId is mandatory",
    REALM_ID_MANDATORY = "realmId is mandatory",
}

export default ErrorMessage;