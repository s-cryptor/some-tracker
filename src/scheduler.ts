import cron from "node-cron";
import { InlineKeyboard, type Bot, type Context } from "grammy";
import { getActivitiesForDay, getActivities, getCheckinsForDateRange } from "./db.js";
import { getTodayDate, getTodayDow, getWeekRange } from "./time.js";
import { buildCheckinKeyboard } from "./keyboards.js";
import { formatWeeklyGrid } from "./grid.js";

const TZ = "Europe/Moscow";

export function setupScheduler(bot: Bot<Context>, adminChatId: number): void {
  // Morning reminder — 8:00 Moscow
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
        `🌅 <b>Доброе утро!</b>\n\nСегодня запланировано:\n${list}\n\nУдачного дня! 💪`,
        { parse_mode: "HTML" }
      );
    },
    { timezone: TZ }
  );

  // Evening check-in — 23:00 Moscow
  cron.schedule(
    "0 23 * * *",
    async () => {
      const date = getTodayDate();
      const dow = getTodayDow();
      const activities = getActivitiesForDay(dow);

      if (activities.length === 0) return;

      const checkins = getCheckinsForDateRange(date, date);
      const keyboard = buildCheckinKeyboard(activities, checkins, date);

      await bot.api.sendMessage(
        adminChatId,
        `🌙 <b>Вечерний чек-ин</b>\nКак прошёл день? Отметь выполненные активности:`,
        { parse_mode: "HTML", reply_markup: keyboard }
      );

      // Wednesday (dow=2): prompt for body measurements
      if (dow === 2) {
        const measureKeyboard = new InlineKeyboard().text("📏 Записать вес и талию", "measure:start");
        await bot.api.sendMessage(
          adminChatId,
          `📐 <b>Среда — день замеров!</b>\nЗапиши вес и обхват талии, чтобы отследить прогресс.`,
          { parse_mode: "HTML", reply_markup: measureKeyboard }
        );
      }
    },
    { timezone: TZ }
  );

  // Weekly stats — Sunday 23:30 Moscow
  cron.schedule(
    "30 23 * * 0",
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

  const text = formatWeeklyGrid(activities, checkins, start, end);
  await bot.api.sendMessage(adminChatId, text, { parse_mode: "HTML" });
}
