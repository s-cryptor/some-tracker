import cron from "node-cron";
import type { Bot, Context } from "grammy";
import {
  getActivitiesForDay,
  getActivities,
  getCheckinsForDateRange,
} from "./db.js";
import { getTodayDate, getTodayDow, getWeekRange } from "./time.js";
import { buildCheckinKeyboard } from "./keyboards.js";
import { formatWeeklyGrid } from "./grid.js";

const TZ = "Asia/Almaty";

export function setupScheduler(bot: Bot<Context>, adminChatId: number): void {
  // Morning reminder — 8:00 AM Almaty
  cron.schedule(
    "0 8 * * *",
    async () => {
      const dow = getTodayDow();
      const activities = getActivitiesForDay(dow);

      if (activities.length === 0) {
        await bot.api.sendMessage(adminChatId, "🌅 Доброе утро! Сегодня запланированных активностей нет. Свободный день!");
        return;
      }

      const list = activities.map((a) => `• ${a.name}`).join("\n");
      await bot.api.sendMessage(
        adminChatId,
        `🌅 *Доброе утро\\!*\n\nСегодня запланировано:\n${escapeMarkdown(list)}\n\nУдачного дня\\! 💪`,
        { parse_mode: "MarkdownV2" }
      );
    },
    { timezone: TZ }
  );

  // Evening check-in — 21:00 Almaty
  cron.schedule(
    "0 21 * * *",
    async () => {
      const date = getTodayDate();
      const dow = getTodayDow();
      const activities = getActivitiesForDay(dow);

      if (activities.length === 0) {
        return;
      }

      const checkins = getCheckinsForDateRange(date, date);
      const keyboard = buildCheckinKeyboard(activities, checkins, date);

      await bot.api.sendMessage(
        adminChatId,
        `🌙 *Вечерний чек-ин*\nКак прошёл день? Отметь выполненные активности:`,
        { parse_mode: "MarkdownV2", reply_markup: keyboard }
      );
    },
    { timezone: TZ }
  );

  // Weekly stats — Sunday 21:30 Almaty
  cron.schedule(
    "30 21 * * 0",
    async () => {
      await sendWeeklyStats(bot, adminChatId);
    },
    { timezone: TZ }
  );
}

export async function sendWeeklyStats(bot: Bot<Context>, adminChatId: number): Promise<void> {
  const { start, end } = getWeekRange();
  const activities = getActivities();
  const checkins = getCheckinsForDateRange(start, end);

  if (activities.length === 0) {
    await bot.api.sendMessage(adminChatId, "Нет активностей для отчёта.");
    return;
  }

  const gridText = formatWeeklyGrid(activities, checkins, start, end);
  await bot.api.sendMessage(adminChatId, gridText, { parse_mode: "Markdown" });
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}
