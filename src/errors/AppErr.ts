class AppErr extends Error {
    errorCode: number;
    statusCode: number;
    constructor(errorCode: number, message: string, statusCode: number) {
        super(message);
        this.errorCode = errorCode
        this.statusCode = statusCode
    }
}

export default AppErr;