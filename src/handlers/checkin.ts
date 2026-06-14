import type { Context } from "grammy";
import { getActivitiesForDay, getCheckinsForDateRange, toggleCheckin } from "../db.js";
import { buildCheckinKeyboard } from "../keyboards.js";
import { getTodayDate } from "../time.js";

export async function sendCheckinMessage(ctx: Context, date?: string): Promise<void> {
  const targetDate = date ?? getTodayDate();
  const [y, m, d] = targetDate.split("-").map(Number);
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7;

  const activities = getActivitiesForDay(dow);
  if (activities.length === 0) {
    await ctx.reply("На сегодня активностей нет. Отдыхай! 🎉");
    return;
  }

  const checkins = getCheckinsForDateRange(targetDate, targetDate);
  const keyboard = buildCheckinKeyboard(activities, checkins, targetDate);

  await ctx.reply(
    `📋 <b>Чек-ин на ${formatDate(targetDate)}</b>\nОтметь выполненные активности:`,
    { parse_mode: "HTML", reply_markup: keyboard }
  );
}

export async function handleCheckinCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith("ci:")) return;

  const parts = data.split(":");
  const activityId = parseInt(parts[1], 10);
  const date = parts[2];

  const completed = toggleCheckin(activityId, date);

  const [y, m, d] = date.split("-").map(Number);
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7;

  const activities = getActivitiesForDay(dow);
  const checkins = getCheckinsForDateRange(date, date);
  const keyboard = buildCheckinKeyboard(activities, checkins, date);

  await ctx.editMessageReplyMarkup({ reply_markup: keyboard });
  await ctx.answerCallbackQuery(completed ? "✅ Отмечено!" : "⬜ Снято");
}

function formatDate(dateStr: string): string {
  const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const [, m, d] = dateStr.split("-").map(Number);
  return `${d} ${months[m - 1]}`;
}
