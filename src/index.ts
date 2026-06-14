import "dotenv/config";
import { createBot } from "./bot.js";
import { setupScheduler } from "./scheduler.js";

const token = process.env.BOT_TOKEN;
const adminChatIdStr = process.env.ADMIN_CHAT_ID;

if (!token) {
  console.error("BOT_TOKEN is not set");
  process.exit(1);
}
if (!adminChatIdStr) {
  console.error("ADMIN_CHAT_ID is not set");
  process.exit(1);
}

const adminChatId = parseInt(adminChatIdStr, 10);
if (isNaN(adminChatId)) {
  console.error("ADMIN_CHAT_ID must be a number");
  process.exit(1);
}

const bot = createBot(token, adminChatId);
setupScheduler(bot as any, adminChatId);

bot.start({
  onStart: () => console.log(`Bot started. Admin: ${adminChatId}`),
});

process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());
