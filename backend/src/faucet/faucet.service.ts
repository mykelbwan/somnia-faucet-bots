import "dotenv/config";
import { ethers } from "ethers";
import { abi } from "./abi";
import { SUPPORTED_TOKENS_CONFIG } from "../config";

const { RPC_PROVIDER, PRIVATE_KEY, SMART_CONTRACT } = process.env;
const provider = new ethers.JsonRpcProvider(RPC_PROVIDER);
const wallet = new ethers.Wallet(PRIVATE_KEY!, provider);
const faucetContract = new ethers.Contract(SMART_CONTRACT!, abi, wallet);

export async function claimNative(to: string, amount: bigint) {
  const tx = await (faucetContract as any).claimNative(to, amount);
  await tx.wait();
  return tx.hash;
}

export async function claimERC20Token(
  to: string,
  tokenSymbol: string,
  amount: bigint
) {
  const tokenConfig = SUPPORTED_TOKENS_CONFIG.find(
    (t) => t.name === tokenSymbol
  );
  if (!tokenConfig) throw new Error("Invalid token");

  const tx = await (faucetContract as any).claimERC20(
    tokenConfig.address,
    to,
    amount
  );
  await tx.wait();
  return tx.hash;
}
