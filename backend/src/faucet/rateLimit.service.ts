// db.ts (using LowDB)
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

// Define the shape of your database file
interface ClaimRecord {
  last_claim: number;
}
interface DBData {
  wallet_claims: Record<string, ClaimRecord>;
  username_claims: Record<string, ClaimRecord>;
}

// Set up the file adapter and the LowDB instance
const adapter = new JSONFile<DBData>("faucet.json");

// Initialize with default empty data if the file doesn't exist
const db = new Low<DBData>(adapter, {
  wallet_claims: {},
  username_claims: {},
});

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// Function to initialize/read the database
async function readDB() {
  await db.read();
  // Ensure data structure is correct if it was empty
  db.data ||= { wallet_claims: {}, username_claims: {} };
}

// LowDB doesn't have transactions, but using await db.write() ensures atomicity
// for the file write operation.

export async function checkAndRegisterClaim(
  wallet: string,
  username: string
): Promise<{ allowed: boolean; error?: string }> {
  await readDB();
  const now = Date.now();

  // --- Check Wallet ---
  const walletRecord = db.data.wallet_claims[wallet];
  if (walletRecord) {
    const elapsed = now - walletRecord.last_claim;
    if (elapsed < TWENTY_FOUR_HOURS_MS) {
      const hoursLeft = Math.ceil(
        (TWENTY_FOUR_HOURS_MS - elapsed) / (1000 * 60 * 60)
      );
      return {
        allowed: false,
        error: `Already claimed. Try again in ${hoursLeft} hours.`,
      };
    }
  }

  // --- Check Username ---
  const userRecord = db.data.username_claims[username];
  if (userRecord) {
    const elapsed = now - userRecord.last_claim;
    if (elapsed < TWENTY_FOUR_HOURS_MS) {
      const hoursLeft = Math.ceil(
        (TWENTY_FOUR_HOURS_MS - elapsed) / (1000 * 60 * 60)
      );
      return {
        allowed: false,
        error: `User (@${username}) already claimed. Try again in ${hoursLeft} hours.`,
      };
    }
  }

  // --- Register Claim ---
  // Update the in-memory object
  db.data.wallet_claims[wallet] = { last_claim: now };
  db.data.username_claims[username] = { last_claim: now };

  // Write the changes to the JSON file
  await db.write();

  return { allowed: true };
}

// Cleanup function for LowDB
export async function cleanupExpiredClaims() {
  await readDB();
  const cutoff = Date.now() - TWENTY_FOUR_HOURS_MS;
  let changes = 0;

  // Clean Wallets
  for (const [key, record] of Object.entries(db.data.wallet_claims)) {
    if (record.last_claim < cutoff) {
      delete db.data.wallet_claims[key];
      changes++;
    }
  }

  // Clean Usernames
  for (const [key, record] of Object.entries(db.data.username_claims)) {
    if (record.last_claim < cutoff) {
      delete db.data.username_claims[key];
      changes++;
    }
  }

  if (changes > 0) {
    await db.write();
    console.log(`[Cleanup] Removed ${changes} expired records.`);
  }
}

// Start cleanup service remains the same, but must handle the async nature
export function startCleanupService() {
  cleanupExpiredClaims(); // Initial run
  setInterval(() => {
    cleanupExpiredClaims().catch((err) =>
      console.error("LowDB Cleanup error:", err)
    );
  }, 60 * 60 * 1000); // Every hour
}
