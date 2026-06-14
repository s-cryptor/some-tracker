import { Bot, type Context } from "grammy";
import {
  conversations,
  createConversation,
  type ConversationFlavor,
} from "@grammyjs/conversations";
import {
  getActivities,
  removeActivity,
} from "./db.js";
import {
  getCheckinsForDateRange,
  getActivitiesForDay,
} from "./db.js";
import { buildCheckinKeyboard, buildRemoveKeyboard } from "./keyboards.js";
import { addActivityConversation } from "./conversations/addActivity.js";
import { handleCheckinCallback, sendCheckinMessage } from "./handlers/checkin.js";
import { formatWeeklyGrid, formatDetailedStats } from "./grid.js";
import { getTodayDate, getTodayDow, getWeekRange } from "./time.js";

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
      `📖 *Помощь*\n\n` +
      `*/add* — добавить новую активность\n` +
      `*/remove* — удалить активность\n` +
      `*/list* — посмотреть все активности и их дни\n` +
      `*/checkin* — ручной чек-ин на сегодня\n` +
      `*/stats* — сетка активности за неделю\n` +
      `*/details* — подробный список за неделю\n\n` +
      `Утром в 8:00 прихожу с напоминанием\\.\n` +
      `Вечером в 21:00 спрошу о прогрессе\\.\n` +
      `Каждое воскресенье в 21:30 — итоги недели\\.`,
      { parse_mode: "MarkdownV2" }
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
    await ctx.editMessageText(`🗑 Активность *${escapeMarkdown(activity.name)}* удалена\\.`, {
      parse_mode: "MarkdownV2",
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
      return `• *${escapeMarkdown(a.name)}* — ${escapeMarkdown(days)}`;
    });
    await ctx.reply(`📋 *Активности:*\n\n${lines.join("\n")}`, {
      parse_mode: "MarkdownV2",
    });
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
    await ctx.reply(text, { parse_mode: "Markdown" });
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
    await ctx.reply(text, { parse_mode: "Markdown" });
  });

  // Error handler
  bot.catch((err) => {
    console.error("Bot error:", err);
  });

  return bot;
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}
