import { Request, Response } from "express";
import { claimNative, claimERC20Token } from "./faucet.service";
import { isAddress, parseEther } from "ethers";
import { isCoolDownActive, registerClaim } from "./rateLimit.service";

const amount = "0.001";

export async function claimSomnia(req: Request, res: Response) {
  try {
    const wallet = ((req.query.wallet as string) || "").toLowerCase(); // normalize wallet to lowercase
    const username = req.query.username as string;
    const tokenSymbol = req.query.tokenSymbol as string;

    if (!wallet) return res.status(400).json({ error: "wallet expected" });
    if (!username) return res.status(400).json({ error: "username expected" });
    if (!isAddress(wallet))
      return res.status(400).json({ error: "Invalid wallet address" });

    // READ-ONLY CHECK
    const check = await isCoolDownActive(wallet, username, tokenSymbol);

    if (!check.allowed) {
      return res.status(429).json({ error: check.error });
    }
    // ATTEMPT BLOCKCHAIN TRANSACTION
    const txHash = await claimNative(wallet, parseEther(amount));

    // ONLY REGISTER IF TRANSACTION SUCCEEDED
    await registerClaim(wallet, username, tokenSymbol);

    res.json({ txHash, amount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function claimERC20(req: Request, res: Response) {
  try {
    const wallet = ((req.query.wallet as string) || "").toLowerCase();
    const token = req.query.token as string;
    const tokenSymbol = req.query.tokenSymbol as string;
    const username = req.query.username as string;

    if (!wallet) return res.status(400).json({ error: "wallet expected" });
    if (!token) return res.status(400).json({ error: "token expected" });
    if (!username) return res.status(400).json({ error: "username expected" });
    if (!isAddress(wallet) || !isAddress(token))
      return res.status(400).json({ error: "Invalid input" });

    // READ-ONLY CHECK
    const check = await isCoolDownActive(wallet, username, tokenSymbol);
    
    if (!check.allowed) {
      return res.status(429).json({ error: check.error });
    }

    // ATTEMPT BLOCKCHAIN TRANSACTION
    const txHash = await claimERC20Token(wallet, token, parseEther(amount));

    // ONLY REGISTER IF TRANSACTION SUCCEEDED
    await registerClaim(wallet, username, tokenSymbol);

    res.json({ txHash, amount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
