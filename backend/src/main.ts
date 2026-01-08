import express, { Express } from "express";
import faucet from "./faucet/faucet.routes";

const app: Express = express();

// This allows the rate limiter to see the user's IP, not the proxy's IP
app.set('trust proxy', 1);
app.use(express.json());

app.use("/api/faucet", faucet);

export default app;
