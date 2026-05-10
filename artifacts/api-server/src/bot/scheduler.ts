import TelegramBot from "node-telegram-bot-api";
import { generateTip } from "./services/gemini";
import { logger } from "../lib/logger";

const SIX_HOURS = 6 * 60 * 60 * 1000;

export function startScheduler(bot: TelegramBot) {
  const channelId = process.env.CHANNEL_ID?.trim();
  if (!channelId) {
    logger.warn("CHANNEL_ID not set — scheduled tips disabled");
    return;
  }

  async function sendScheduledTip() {
    try {
      const tip = await generateTip();
      const text = `💡 *نصيحة اليوم*\n\n${tip}\n\n⏰ ${new Date().toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })}`;
      await bot.sendMessage(channelId!, text, { parse_mode: "Markdown" });
      logger.info("Scheduled tip sent to channel");
    } catch (e: any) {
      logger.error({ err: e }, "Failed to send scheduled tip");
    }
  }

  // Send first tip after 1 minute, then every 6 hours
  setTimeout(() => {
    sendScheduledTip();
    setInterval(sendScheduledTip, SIX_HOURS);
  }, 60 * 1000);

  logger.info(`Scheduler started — tips every 6 hours to channel ${channelId}`);
}
