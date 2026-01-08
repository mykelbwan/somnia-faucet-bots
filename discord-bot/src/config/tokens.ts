import "dotenv/config";

export interface TokenSettings {
  endpoint: string;
  address: string | null;
}

const MAIN_ENTRY = process.env.MAIN_ENTRY;
const claimNative = `${MAIN_ENTRY}/api/faucet/claim-stt`;
const claimERC = `${MAIN_ENTRY}/api/faucet/claim-erc20`;

export const TOKEN_CONFIG: Record<string, TokenSettings> = {
  STT: {
    endpoint: claimNative,
    address: null,
  },
  FS: {
    endpoint: claimERC,
    address: "0x174bfb87F8B69619352879fd66116b705121efe6",
  },
};

