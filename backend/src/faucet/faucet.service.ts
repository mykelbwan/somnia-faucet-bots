import "dotenv/config";
import { ethers } from "ethers";
import { abi } from "./abi";

const { RPC_PROVIDER, PRIVATE_KEY, SMART_CONTRACT } = process.env;
const provider = new ethers.JsonRpcProvider(RPC_PROVIDER);
const wallet = new ethers.Wallet(PRIVATE_KEY!, provider);
const faucetContract = new ethers.Contract(SMART_CONTRACT!, abi, wallet);

export async function claimNative(to: string, amount: bigint) {
  try {
    const tx = await (faucetContract as any).claimNative(to, amount);
    await tx.wait();
    return tx.hash;
  } catch (err: any) {
    const error = parseSmartContractError(err);
    console.error(`[ERC20 Claim Error]: ${error}`);
    throw new Error(error);
  }
}

export async function claimERC20Token(
  to: string,
  address: string,
  amount: bigint
) {
  try {
    const tx = await (faucetContract as any).claimERC20(address, to, amount);
    await tx.wait();
    return tx.hash;
  } catch (err: any) {
    const cleanError = parseSmartContractError(err);
    console.error(`[Native Claim Error]: ${cleanError}`);
    throw new Error(cleanError); 
  }
}

function parseSmartContractError(err: any): string {

  if (err.data && faucetContract.interface) {
    try {
      const decoded = faucetContract.interface.parseError(err.data);
      if (decoded) return `Contract Error: ${decoded.name}`;
    } catch (e) {
      console.error("Failed to decode error fragment:", e);
    }
  }

  if (err.reason) return err.reason;
  if (err.shortMessage) return err.shortMessage;

  const selectors: Record<string, string> = {
    "0xad3a8b9e": "InvalidToken: This token is not supported by the faucet.",
    "0x08c379a0": "Error: Generic revert with string message.",
  };

  if (err.data && selectors[err.data]) {
    return selectors[err.data]!;
  }

  return "Blockchain Error: The transaction was reverted by the network.";
}