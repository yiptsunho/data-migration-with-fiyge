import express from "express";
import errorHandler from "./middlewares/ErrorHandler";
import HealthCheckRoute from "./routes/HealthCheckRoute";
import QuickBooksRoute from "./routes/QuickBooksRoute";
import cors from "cors"

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());
app.use(cors({
    origin: "http://localhost:3000",
}))
app.use("/api/health-check", HealthCheckRoute)
app.use("/data-migration/quick-books", QuickBooksRoute)
// @ts-ignore
app.use(errorHandler);

app.listen(port, () => {
    return console.log(`Express is listening at http://localhost:${port}`);
});

export default app;