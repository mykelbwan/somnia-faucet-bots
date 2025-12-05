import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import axios from "axios";

const { USDC, MAIN_ENTRY, TELEGRAM_BOT_TOKEN } = process.env;
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN!, { polling: true });
const claimNative = `${MAIN_ENTRY}/api/faucet/claim-stt`;
const claimERC = `${MAIN_ENTRY}/api/faucet/claim-erc20`;

bot.onText(/!(STT|USDC)\s+(0x[a-fA-F0-9]{40})/, async (msg, match) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username || msg.from?.first_name;

  if (!match) return bot.sendMessage(chatId, "Invalid command");

  const command = match[1];
  const wallet = match[2];

  try {
    let tHash: string = "";
    let amount: string = "";

    if (command === "STT") {
      const res = await axios.get(claimNative, {
        params: { wallet, username },
      });

      tHash = res.data.txHash;
    }
    if (command === "USDC") {
      const res = await axios.get(claimERC, {
        params: { wallet, token: USDC, username },
      });

      tHash = res.data.txHash;
      amount = res.data.amount;
    }

    const messageText = `Received <b>${amount} ${command}</b>. 
    View the <a href="https://shannon-explorer.somnia.network/tx/${tHash}">transaction</a>.
    `;
    bot.sendMessage(chatId, messageText, { parse_mode: "HTML" });
  } catch (err: any) {
    console.log(err);
    return bot.sendMessage(
      chatId,
      `Error: ${err?.response.data.error || "Unknown error"}`
    );
  }
});

bot.on("polling_error", (err) => console.error("Polling error:", err));
