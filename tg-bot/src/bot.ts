import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import { FAUCET_REGEX, TOKEN_CONFIG } from "./config/tokens";

const { TELEGRAM_BOT_TOKEN } = process.env;
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN!, { polling: true });

bot.onText(FAUCET_REGEX, async (msg, match) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username || msg.from?.first_name;

  if (!match) return bot.sendMessage(chatId, "Invalid command");

  const command = (match[1] || match[2])?.toUpperCase();

  if (!command) throw new Error("Invalid Command");

  const wallet = match[3];

  try {
    const config = TOKEN_CONFIG[command];
    if (!config) throw new Error("Invalid config");

    const res = await axios.get(config.endpoint, {
      params: {
        wallet,
        username,
        tokenSymbol: command,
        token: config.address,
      },
    });

    const { txHash, amount } = res.data;

    const messageText = `Received <b>${amount} ${command}</b>.
<a href="https://shannon-explorer.somnia.network/tx/${txHash}">View the transaction</a>.`;

    bot.sendMessage(chatId, messageText, { parse_mode: "HTML" });
  } catch (err: any) {
    console.error(`❌ Claim failed for ${username}:`, err.message);

    let userFriendlyError = "Connection error. Please try again.";

    if (err.response?.data?.error) {
      userFriendlyError = err.response.data.error;
    } else if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
      userFriendlyError = "Faucet server is currently unreachable.";
    }

    return bot
      .sendMessage(chatId, `❌ <b>Error:</b> ${userFriendlyError}`, {
        parse_mode: "HTML",
      })
      .catch((e) => console.error("Could not send TG message:", e.message));
  }
});

bot.onText(/^[!\/]status\s+(0x[a-fA-F0-9]{40})$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username || msg.from?.first_name || "unknown";
  const wallet = match?.[1];
  const tokenList = Object.keys(TOKEN_CONFIG).join(",");

  try {
    bot.sendChatAction(chatId, "typing");
    const res = await axios.get(
      `${process.env.MAIN_ENTRY}/api/faucet/claim-status`,
      {
        params: { wallet, username, tokens: tokenList },
      }
    );

    const statusLines = Object.entries(res.data)
      .map(
        ([token, time]) =>
          `${time === "Ready" ? "✅" : "⏳"} <b>${token}:</b> ${time}`
      )
      .join("\n");

    bot.sendMessage(
      chatId,
      `<b>📊 Status for:</b> <code>${wallet}</code>\n\n${statusLines}`,
      { parse_mode: "HTML" }
    );
  } catch (err) {
    bot.sendMessage(chatId, "❌ <b>Error:</b> Faucet server unreachable.");
  }
});

bot.onText(/^[!\/]status$/i, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "⚠️ <b>Wallet address required</b>\nUsage: <code>!status 0x...</code>",
    { parse_mode: "HTML" }
  );
});

bot.onText(/^[!\/]help(?:@\w+)?$/i, (msg) => {
  const chatId = msg.chat.id;
  const tokenList = Object.keys(TOKEN_CONFIG);

  const response = `
<b>🚀 Somnia Faucet Guide</b>

<b>Commands:</b>
• <code>!status [WALLET]</code> - Check your cooldowns
• <code>!help</code> - Show this guide

<b>Claiming Tokens:</b>
Format: <code>![TOKEN] [WALLET]</code>

<b>Supported Assets:</b>
${tokenList.map((t) => `• <code>!${t}</code>`).join("\n")}

<b>Example:</b>
<code>!STT 0x123...456</code>

<i>Note: Each token has an individual 24h cooldown.</i>`;

  bot.sendMessage(chatId, response, { parse_mode: "HTML" });
});

bot.on("polling_error", (error) => {
  if (error.message === "EFATAL") {
    console.log("[Telegram] Connection lost. Reconnecting...");
  } else {
    console.error("⚠️ [Telegram] Polling error:", error.message);
  }
});
