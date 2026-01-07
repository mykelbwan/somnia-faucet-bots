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

  const command = match[1]?.toUpperCase();

  if (!command) throw new Error("Invalid Command");

  const wallet = match[2];

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
    console.log(err);
    return bot.sendMessage(
      chatId,
      `${err?.response.data.error || "Unknown error"}`
    );
  }
});

bot.on("polling_error", (err) => console.error("Polling error:", err));
