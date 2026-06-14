import type { Conversation } from "@grammyjs/conversations";
import type { Context } from "grammy";
import { addActivity } from "../db.js";
import { buildDaysKeyboard } from "../keyboards.js";

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export async function addActivityConversation(
  conversation: Conversation<Context>,
  ctx: Context
): Promise<void> {
  await ctx.reply("Как назвать активность? Отправь название или /cancel для отмены.");

  const nameCtx = await conversation.waitFor("message:text");
  const name = nameCtx.message.text.trim();

  if (name === "/cancel") {
    await ctx.reply("Отменено.");
    return;
  }

  if (!name || name.length > 50) {
    await ctx.reply("Слишком длинное или пустое название. Попробуй ещё раз через /add.");
    return;
  }

  const selected = new Set<number>();

  const msg = await ctx.reply("Выбери дни недели, когда нужно выполнять эту активность:", {
    reply_markup: buildDaysKeyboard(selected),
  });

  while (true) {
    const cb = await conversation.waitForCallbackQuery(/^d:/);
    const data = cb.callbackQuery.data;

    if (data === "d:done") {
      await cb.answerCallbackQuery();
      break;
    }

    const day = parseInt(data.replace("d:", ""), 10);
    if (selected.has(day)) {
      selected.delete(day);
    } else {
      selected.add(day);
    }

    await cb.editMessageReplyMarkup({ reply_markup: buildDaysKeyboard(selected) });
    await cb.answerCallbackQuery();
  }

  if (selected.size === 0) {
    await ctx.reply("Не выбрано ни одного дня. Активность не добавлена. Попробуй ещё раз через /add.");
    return;
  }

  const days = [...selected].sort((a, b) => a - b);
  addActivity(name, days);

  const dayLabels = days.map((d) => DAY_NAMES[d]).join(", ");
  await ctx.reply(
    `✅ Активность *${name}* добавлена\\!\nДни: ${escapeMarkdown(dayLabels)}`,
    { parse_mode: "MarkdownV2" }
  );

  // Edit the days keyboard message to remove buttons
  try {
    await ctx.api.editMessageReplyMarkup(
      msg.chat.id,
      msg.message_id,
      { reply_markup: undefined }
    );
  } catch {
    // ignore if already gone
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}
