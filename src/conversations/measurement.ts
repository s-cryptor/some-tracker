import type { Conversation } from "@grammyjs/conversations";
import type { Context } from "grammy";
import { getMeasurement, saveMeasurement } from "../db.js";
import { getTodayDate } from "../time.js";

export async function measurementConversation(
  conversation: Conversation<Context>,
  ctx: Context
): Promise<void> {
  const date = getTodayDate();
  const existing = getMeasurement(date);

  const weightHint = existing?.weight != null ? ` (прошлый раз: ${existing.weight} кг)` : "";
  const waistHint = existing?.waist != null ? ` (прошлый раз: ${existing.waist} см)` : "";

  await ctx.reply(`⚖️ Введи вес в кг${weightHint}:\n(или /cancel для отмены)`);

  const weight = await askNumber(conversation, ctx, "вес");
  if (weight === null) return;

  await ctx.reply(`📏 Введи обхват талии в см${waistHint}:`);

  const waist = await askNumber(conversation, ctx, "обхват талии");
  if (waist === null) return;

  saveMeasurement(date, weight, waist);

  await ctx.reply(
    `✅ Записано!\n\n⚖️ Вес: <b>${weight} кг</b>\n📏 Талия: <b>${waist} см</b>`,
    { parse_mode: "HTML" }
  );
}

async function askNumber(
  conversation: Conversation<Context>,
  ctx: Context,
  label: string
): Promise<number | null> {
  while (true) {
    const msgCtx = await conversation.waitFor("message:text");
    const text = msgCtx.message.text.trim();

    if (text === "/cancel") {
      await ctx.reply("Отменено.");
      return null;
    }

    const value = parseFloat(text.replace(",", "."));
    if (!isNaN(value) && value > 0 && value < 1000) {
      return value;
    }

    await ctx.reply(`Не похоже на число. Введи ${label} ещё раз:`);
  }
}
