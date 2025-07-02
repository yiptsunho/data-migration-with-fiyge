import {StatusCodes} from "http-status-codes";
import AppErr from "../errors/AppErr";
import {NextFunction, Request, Response} from "express";

const errorHandler = function (err: Error, req: Request, res: Response, next: NextFunction) {
    console.error(err.stack)
    if (err instanceof AppErr) {
        return res.status(err.statusCode).json({
            errorCode: err.errorCode,
            message: err.message
        })
    }

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Something went wrong")
}

export default errorHandler;