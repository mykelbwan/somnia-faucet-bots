import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

interface ClaimRecord {
  last_claim: number;
}
interface DBData {
  wallet_claims: Record<string, ClaimRecord>;
  username_claims: Record<string, ClaimRecord>;
}

const adapter = new JSONFile<DBData>("faucet.json");
const db = new Low<DBData>(adapter, {
  wallet_claims: {},
  username_claims: {},
});

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

async function readDB() {
  try {
    await db.read();
    // If the file was read but data is null/undefined, set defaults
    db.data ||= { wallet_claims: {}, username_claims: {} };
  } catch (error) {
    // If the file is empty or malformed, reset it to default empty state
    console.error(
      "[DB Error] faucet.json is malformed. Resetting to defaults..."
    );
    db.data = { wallet_claims: {}, username_claims: {} };
    await db.write();
  }
}

export async function isCoolDownActive(
  wallet: string,
  username: string,
  token: string
): Promise<{ allowed: boolean; error?: string; timeLeft?: number }> {
  await readDB();

  const now = Date.now();
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  const tokenUpper = token.toUpperCase();

  const walletKey = `${wallet.toLowerCase()}:${tokenUpper}`;
  const usernameKey = `${username}:${tokenUpper}`;

  const walletRecord = db.data.wallet_claims[walletKey];
  if (walletRecord) {
    const elapsed = now - walletRecord.last_claim;
    if (elapsed < TWENTY_FOUR_HOURS_MS) {
      const timeLeft = TWENTY_FOUR_HOURS_MS - elapsed;
      return {
        allowed: false,
        timeLeft: timeLeft,
        error: `Wallet cooldown active.`,
      };
    }
  }

  const userRecord = db.data.username_claims[usernameKey];
  if (userRecord) {
    const elapsed = now - userRecord.last_claim;
    if (elapsed < TWENTY_FOUR_HOURS_MS) {
      const timeLeft = TWENTY_FOUR_HOURS_MS - elapsed;
      return {
        allowed: false,
        timeLeft: timeLeft,
        error: `Username cooldown active.`,
      };
    }
  }

  return { allowed: true, timeLeft: 0 };
}

export async function registerClaim(
  wallet: string,
  username: string,
  token: string
) {
  const walletKey = `${wallet}:${token.toUpperCase()}`;
  const usernameKey = `${username}:${token.toUpperCase()}`;

  db.data.wallet_claims[walletKey] = { last_claim: Date.now() };
  db.data.username_claims[usernameKey] = { last_claim: Date.now() };

  await db.write();
}

// Cleanup iterates through all keys regardless of format
export async function cleanupExpiredClaims() {
  await readDB();
  const cutoff = Date.now() - TWENTY_FOUR_HOURS_MS;
  let changes = 0;

  const sections: (keyof DBData)[] = ["wallet_claims", "username_claims"];
  for (const section of sections) {
    for (const [key, record] of Object.entries(db.data[section])) {
      if (record.last_claim < cutoff) {
        delete db.data[section][key];
        changes++;
      }
    }
  }

  if (changes > 0) {
    await db.write();
    console.log(`[Cleanup] Removed ${changes} expired records.`);
  }
}

export function startCleanupService() {
  cleanupExpiredClaims();
  setInterval(() => {
    cleanupExpiredClaims().catch((err) =>
      console.error("LowDB Cleanup error:", err)
    );
  }, 60 * 60 * 1000);
}
