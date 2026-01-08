import { Router } from "express";
import { claimERC20, claimSomnia, getClaimStatus } from "./faucet.controller";
import { globalFaucetLimiter } from "./middleware/limiter";

const router: Router = Router();

router.get("/claim-stt", globalFaucetLimiter, claimSomnia);
router.get("/claim-erc20", globalFaucetLimiter, claimERC20);
router.get("/claim-status", getClaimStatus);

export default router;
