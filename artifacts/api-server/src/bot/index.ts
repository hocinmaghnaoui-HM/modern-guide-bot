import TelegramBot from "node-telegram-bot-api";
import { registerCommandHandlers } from "./handlers/commandHandlers";
import { registerMessageHandlers } from "./handlers/messageHandlers";
import { startScheduler } from "./scheduler";
import { logger } from "../lib/logger";

export function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.error("TELEGRAM_BOT_TOKEN not set — bot not started");
    return;
  }

  const bot = new TelegramBot(token, { polling: true });

  bot.on("polling_error", (err) => {
    logger.error({ err }, "Telegram polling error");
  });

  registerCommandHandlers(bot);
  registerMessageHandlers(bot);
  startScheduler(bot);

  logger.info("Telegram bot started successfully");
  return bot;
}
