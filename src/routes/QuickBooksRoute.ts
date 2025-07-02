import express, {Request} from "express"
import {ReasonPhrases, StatusCodes} from "http-status-codes";
import quickBooksService from "../services/QuickBooksService";
import {ExchangeTokenRequestType, MigrateDataRequestType} from "../constants/Types";

const router = express.Router()

// router.post("/authUri", async (req: Request<{}, {}, ExchangeTokenRequestType>, res, next) => {
//     try {
//         const result = await quickBooksService.getAuthUri(req)
//         res.status(StatusCodes.OK).json({
//             data: result,
//         })
//     } catch (err) {
//         next(err);
//     }
// })

router.post("/exchange-token", async (req: Request<{}, {}, ExchangeTokenRequestType>, res, next) => {
    try {
        const result = await quickBooksService.exchangeToken(req)
        res.status(StatusCodes.OK).json({
            data: result,
        })
    } catch (err) {
        console.error(err);
        next(err);
    }
})

router.post("/migrate", async (req: Request<{}, {}, MigrateDataRequestType>, res, next) => {
    try {
        const result = await quickBooksService.migrateData(req)
        res.status(StatusCodes.OK).json({
            data: result,
        })
    } catch (err) {
        next(err);
    }
})

export default router;