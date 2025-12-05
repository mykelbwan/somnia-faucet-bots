import { Router } from "express";
import { claimERC20, claimSomnia } from "./faucet.controller";

const router: Router = Router();

router.get("/claim-stt", claimSomnia);
router.get("/claim-erc20", claimERC20);

export default router;
