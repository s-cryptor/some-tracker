import { Bot, type Context } from "grammy";
import {
  conversations,
  createConversation,
  type ConversationFlavor,
} from "@grammyjs/conversations";
import { getActivities, removeActivity, getCheckinsForDateRange } from "./db.js";
import { buildCheckinKeyboard, buildRemoveKeyboard, buildWeekNavKeyboard } from "./keyboards.js";
import { addActivityConversation } from "./conversations/addActivity.js";
import { handleCheckinCallback, sendCheckinMessage } from "./handlers/checkin.js";
import { formatWeeklyGrid, formatDetailedStats } from "./grid.js";
import { getWeekRange } from "./time.js";

type MyContext = ConversationFlavor<Context>;

export function createBot(token: string, adminChatId: number): Bot<MyContext> {
  const bot = new Bot<MyContext>(token);

  // Guard: only respond to admin
  bot.use(async (ctx, next) => {
    if (ctx.from?.id !== adminChatId && ctx.chat?.id !== adminChatId) return;
    await next();
  });

  // Conversations middleware
  bot.use(conversations<MyContext, MyContext>());
  bot.use(createConversation(addActivityConversation, "addActivity"));

  // /start
  bot.command("start", async (ctx) => {
    await ctx.reply(
      `👋 Привет! Я твой трекер привычек.\n\n` +
      `Команды:\n` +
      `/add — добавить активность\n` +
      `/remove — удалить активность\n` +
      `/list — список активностей\n` +
      `/checkin — отметить активности вручную\n` +
      `/stats — статистика за неделю\n` +
      `/details — подробный отчёт\n` +
      `/help — помощь`
    );
  });

  // /help
  bot.command("help", async (ctx) => {
    await ctx.reply(
      `📖 <b>Помощь</b>\n\n` +
      `/add — добавить новую активность\n` +
      `/remove — удалить активность\n` +
      `/list — посмотреть все активности и их дни\n` +
      `/checkin — ручной чек-ин на сегодня\n` +
      `/stats — сетка активности за неделю\n` +
      `/details — подробный список за неделю\n\n` +
      `Утром в 8:00 прихожу с напоминанием.\n` +
      `Вечером в 22:00 спрошу о прогрессе.\n` +
      `Каждое воскресенье в 22:30 — итоги недели.`,
      { parse_mode: "HTML" }
    );
  });

  // /add
  bot.command("add", async (ctx) => {
    await ctx.conversation.enter("addActivity");
  });

  // /remove
  bot.command("remove", async (ctx) => {
    const activities = getActivities();
    if (activities.length === 0) {
      await ctx.reply("Нет активностей для удаления.");
      return;
    }
    await ctx.reply("Какую активность удалить?", {
      reply_markup: buildRemoveKeyboard(activities),
    });
  });

  // Remove callbacks
  bot.callbackQuery(/^rm:/, async (ctx) => {
    const data = ctx.callbackQuery.data;
    if (data === "rm:cancel") {
      await ctx.editMessageText("Отменено.");
      await ctx.answerCallbackQuery();
      return;
    }
    const id = parseInt(data.replace("rm:", ""), 10);
    const activities = getActivities();
    const activity = activities.find((a) => a.id === id);
    if (!activity) {
      await ctx.answerCallbackQuery("Активность не найдена.");
      return;
    }
    removeActivity(id);
    await ctx.editMessageText(`🗑 Активность <b>${escapeHtml(activity.name)}</b> удалена.`, {
      parse_mode: "HTML",
    });
    await ctx.answerCallbackQuery("Удалено!");
  });

  // /list
  bot.command("list", async (ctx) => {
    const activities = getActivities();
    if (activities.length === 0) {
      await ctx.reply("Нет активностей. Добавь через /add.");
      return;
    }
    const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
    const lines = activities.map((a) => {
      const days = a.days.length === 7
        ? "каждый день"
        : a.days.map((d) => dayNames[d]).join(", ");
      return `• <b>${escapeHtml(a.name)}</b> — ${days}`;
    });
    await ctx.reply(`📋 <b>Активности:</b>\n\n${lines.join("\n")}`, { parse_mode: "HTML" });
  });

  // /checkin — manual check-in for today
  bot.command("checkin", async (ctx) => {
    await sendCheckinMessage(ctx as unknown as Context);
  });

  // Check-in toggle callbacks
  bot.callbackQuery(/^ci:/, handleCheckinCallback as (ctx: MyContext) => Promise<void>);

  // /stats — weekly grid
  bot.command("stats", async (ctx) => {
    const { start, end } = getWeekRange();
    const activities = getActivities();
    if (activities.length === 0) {
      await ctx.reply("Нет активностей. Добавь через /add.");
      return;
    }
    const checkins = getCheckinsForDateRange(start, end);
    const text = formatWeeklyGrid(activities, checkins, start, end);
    await ctx.reply(text, { parse_mode: "HTML", reply_markup: buildWeekNavKeyboard(start, "stats") });
  });

  // /details — detailed weekly report
  bot.command("details", async (ctx) => {
    const { start, end } = getWeekRange();
    const activities = getActivities();
    if (activities.length === 0) {
      await ctx.reply("Нет активностей. Добавь через /add.");
      return;
    }
    const checkins = getCheckinsForDateRange(start, end);
    const text = formatDetailedStats(activities, checkins, start, end);
    await ctx.reply(text, { parse_mode: "HTML", reply_markup: buildWeekNavKeyboard(start, "details") });
  });

  // Week navigation callbacks for stats and details
  bot.callbackQuery(/^(stats|details):week:/, async (ctx) => {
    const data = ctx.callbackQuery.data;
    const [mode, , weekStart] = data.split(":");
    const { end } = getWeekRange(weekStart);
    const activities = getActivities();
    if (activities.length === 0) {
      await ctx.answerCallbackQuery("Нет активностей.");
      return;
    }
    const checkins = getCheckinsForDateRange(weekStart, end);
    const text = mode === "stats"
      ? formatWeeklyGrid(activities, checkins, weekStart, end)
      : formatDetailedStats(activities, checkins, weekStart, end);
    await ctx.editMessageText(text, {
      parse_mode: "HTML",
      reply_markup: buildWeekNavKeyboard(weekStart, mode as "stats" | "details"),
    });
    await ctx.answerCallbackQuery();
  });

  // Error handler
  bot.catch((err) => {
    console.error("Bot error:", err);
  });

  return bot;
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
