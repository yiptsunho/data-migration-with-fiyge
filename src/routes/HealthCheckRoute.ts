import express from "express"
import {ReasonPhrases, StatusCodes} from "http-status-codes";

const router = express.Router()

router.get("/", (req, res) => {
    res.status(StatusCodes.OK).json(ReasonPhrases.OK);
})

export default router;