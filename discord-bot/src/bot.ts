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
import { TOKEN_CONFIG } from "./config/tokens";

const { DISCORD_BOT_TOKEN, BOT_ID } = process.env;

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const tokenChoices = Object.keys(TOKEN_CONFIG).map((symbol) => ({
  name: `${symbol} ${symbol === "STT" ? "(Native)" : "(ERC20)"}`,
  value: symbol,
}));

const commands = [
  new SlashCommandBuilder()
    .setName("faucet")
    .setDescription("Claim testnet tokens")
    .addStringOption((option) =>
      option
        .setName("token")
        .setDescription("Select the token")
        .setRequired(true)
        .addChoices(...tokenChoices)
    )
    .addStringOption((option) =>
      option
        .setName("wallet")
        .setDescription("Your 0x wallet address")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Learn how to use the Somnia Faucet"),
  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Check your current token cooldowns")
    .addStringOption((option) =>
      option
        .setName("wallet")
        .setDescription("The 0x wallet address to check")
        .setRequired(true)
    ),
];

bot.once("clientReady", async () => {
  console.log("discord bot now online");

  const rest = new REST({ version: "10" }).setToken(DISCORD_BOT_TOKEN!);

  try {
    await rest.put(Routes.applicationCommands(BOT_ID!), { body: commands });
  } catch (e) {
    console.error("An error occurred:", e);
  }
});

bot.on("interactionCreate", async (interaction: Interaction<CacheType>) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    const { commandName } = interaction;

    // HELP COMMAND 
    if (commandName === "help") {
      const tokenList = Object.keys(TOKEN_CONFIG);

      const helpMessage = `
# 🚀 Somnia Faucet Guide

### 🛠 Commands
• \`/status [wallet]\` - Check your cooldowns
• \`/help\` - Show this guide

### 💎 Claiming Tokens
**Format:** \`/faucet token:[TOKEN] wallet:[ADDRESS]\`

**Supported Assets:**
${tokenList.map((t) => `• \`${t}\``).join("\n")}

### 💡 Example
\`/faucet token:STT wallet:0x123...456\`

*Note: Each token has an individual 24h cooldown.*
`;

      return await interaction.reply({
        content: helpMessage,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (commandName == "faucet") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const symbol = interaction.options.getString("token", true);
      const wallet = interaction.options.getString("wallet", true);
      const config = TOKEN_CONFIG[symbol];
      if (!config) throw new Error("Invalid config");

      if (!/^0x[a-fA-F0-9]{40}$/i.test(wallet)) {
        return interaction.editReply({ content: "❌ Invalid wallet format." });
      }

      const res = await axios.get(config.endpoint, {
        params: {
          wallet,
          username: interaction.user.username,
          tokenSymbol: symbol,
          token: config.address,
        },
      });

      const { txHash, amount } = res.data;

      await interaction.editReply({
        content: `
✅ Received **${amount} ${symbol}**.\n[View Transaction](https://shannon-explorer.somnia.network/tx/${txHash})`,
      });
    }

    if (commandName === "status") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const wallet = interaction.options.getString("wallet", true);
      const tokenList = Object.keys(TOKEN_CONFIG).join(",");

      try {
        const res = await axios.get(
          `${process.env.MAIN_ENTRY}/api/faucet/claim-status`,
          {
            params: {
              wallet,
              username: interaction.user.username,
              tokens: tokenList,
            },
          }
        );

        const statusLines = Object.entries(res.data)
          .map(
            ([token, time]) =>
              `${time === "Ready" ? "✅" : "⏳"} **${token}:** ${time}`
          )
          .join("\n");

        await interaction.editReply({
          content: `### 📊 Faucet Status\n**Wallet:** \`${wallet}\`\n\n${statusLines}`,
        });
      } catch (err: any) {
        await interaction.editReply({
          content: "❌ Failed to fetch status. Server might be down.",
        });
      }
    }
  } catch (err: any) {
    console.error("Interaction Error:", err);

    try {
      if (interaction.deferred || interaction.replied) {
        const errorMessage = err?.response?.data?.error
          ? `${err.response.data.error}`
          : `An unknown error occurred. (Code: ${err.code || "N/A"})`;

        await interaction.editReply({ content: errorMessage });
      }
    } catch (finalErr) {
      console.error(
        "Double-fault: Failed to send final error reply.",
        finalErr
      );
    }
  }
});

bot.login(DISCORD_BOT_TOKEN);
