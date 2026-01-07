import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  Interaction,
  CacheType,
  MessageFlags,
} from "discord.js";
import axios from "axios";

const { DISCORD_BOT_TOKEN, MAIN_ENTRY, BOT_ID, USDC } = process.env;
if (!DISCORD_BOT_TOKEN || !BOT_ID) {
  throw new Error(
    "Missing critical environment variables: DISCORD_BOT_TOKEN and/or BOT_ID must be set."
  );
}
const claimNative = `${MAIN_ENTRY}/api/faucet/claim-stt`;
const claimERC = `${MAIN_ENTRY}/api/faucet/claim-erc20`;

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const commands = [
  new SlashCommandBuilder()
    .setName("faucet")
    .setDescription("Claims native or ERC20 test tokens from the Somnia Faucet")
    .addStringOption((option) =>
      option
        .setName("token")
        .setDescription("the token you want to claim (STT or USDT)")
        .setRequired(true)
        .addChoices(
          { name: "STT (Native token)", value: "STT" },
          { name: "USDC (ERC20 token)", value: "USDC" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("wallet")
        .setDescription("Your wallet address (e.g, 0xyour-wallet-address)")
        .setRequired(true)
    ),
];

bot.once("clientReady", async () => {
  console.log("discord bot now online");

  const rest = new REST({ version: "10" }).setToken(DISCORD_BOT_TOKEN);

  try {
    await rest.put(Routes.applicationCommands(BOT_ID), { body: commands });
  } catch (e) {
    console.error("An error occurred:", e);
  }
});

bot.on("interactionCreate", async (interaction: Interaction<CacheType>) => {
  if (
    !interaction.isChatInputCommand() ||
    interaction.commandName !== "faucet"
  ) {
    return;
  }

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const command = interaction.options.getString("token", true);
    const wallet = interaction.options.getString("wallet", true);
    const username = interaction.user.username;

    if (!/^0x[a-fA-F0-9]{40}$/i.test(wallet)) {
      return interaction.editReply({
        content:
          "❌ **Error:** Invalid wallet address format. Must be a 0x-prefixed 40-character hex string.",
      });
    }

    let tHash: string = "";
    let amount: string = "";

    if (command === "STT") {
      const res = await axios.get(claimNative, {
        params: { wallet, username, tokenSymbol: "STT" },
      });
      tHash = res.data.txHash;
      amount = res.data.amount;
    } else if (command === "USDC") {
      const res = await axios.get(claimERC, {
        params: { wallet, token: USDC, username,tokenSymbol:"USDC" },
      });
      tHash = res.data.txHash;
      amount = res.data.amount;
    }

    const messageText = `
Received **${amount} ${command}**.
[View transaction on Explorer](https://shannon-explorer.somnia.network/tx/${tHash})`;

    // Use editReply because we deferred the reply earlier
    await interaction.editReply({ content: messageText });
  } catch (err: any) {
    // This catches:
    // a) The DiscordAPIError from deferReply (10062)
    // b) The Axios errors from the API calls
    // c) Errors from editReply (if the token expired later)

    console.error(
      "Fatal Interaction Error:",
      err.code || "N/A",
      err.message || err
    );

    // If the interaction is still alive, send an error reply.
    // We use a nested try/catch because interaction.editReply can also fail (especially if 10062 happened).
    try {
      if (interaction.deferred || interaction.replied) {
        // If we successfully deferred, we can attempt to edit the reply.
        const errorMessage = err?.response?.data?.error
          ? `${err.response.data.error}`
          : `An unknown error occurred. (Code: ${err.code || "N/A"})`;

        await interaction.editReply({ content: errorMessage });
      }
    } catch (finalErr) {
      // This is the safety net for the safety net.
      // If even editReply fails (likely due to 10062 expiring the token),
      // we log it but do not crash the main application.
      console.error(
        "Double-fault: Failed to send final error reply.",
        finalErr
      );
    }
  }
});

bot.login(DISCORD_BOT_TOKEN);
