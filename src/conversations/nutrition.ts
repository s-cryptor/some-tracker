import type { Conversation } from "@grammyjs/conversations";
import type { Context } from "grammy";
import { getNutrition, saveNutrition } from "../db.js";
import { getTodayDate } from "../time.js";

type NutritionKey = "calories" | "protein" | "fat" | "carbs";

interface Field {
  key: NutritionKey;
  label: string;
  unit: string;
  emoji: string;
  max: number;
}

const FIELDS: Field[] = [
  { key: "calories", label: "Калории", unit: "ккал", emoji: "🔥", max: 10000 },
  { key: "protein",  label: "Белки",   unit: "г",    emoji: "🥩", max: 500 },
  { key: "fat",      label: "Жиры",    unit: "г",    emoji: "🧈", max: 500 },
  { key: "carbs",    label: "Углеводы",unit: "г",    emoji: "🍞", max: 1000 },
];

export async function nutritionConversation(
  conversation: Conversation<Context>,
  ctx: Context
): Promise<void> {
  const date = getTodayDate();
  const existing = getNutrition(date);

  const values: Record<string, number> = {};

  for (const field of FIELDS) {
    const hint = existing?.[field.key] != null ? ` (прошлый раз: ${existing[field.key]} ${field.unit})` : "";
    await ctx.reply(`${field.emoji} ${field.label}${hint} (${field.unit}):\n/cancel для отмены`);

    const value = await askPositiveNumber(conversation, ctx, field.label, field.max);
    if (value === null) return;
    values[field.key] = value;
  }

  saveNutrition(date, values.calories, values.protein, values.fat, values.carbs);

  await ctx.reply(
    `✅ КБЖУ за сегодня записано!\n\n` +
    `🔥 Калории: <b>${values.calories} ккал</b>\n` +
    `🥩 Белки: <b>${values.protein} г</b>\n` +
    `🧈 Жиры: <b>${values.fat} г</b>\n` +
    `🍞 Углеводы: <b>${values.carbs} г</b>`,
    { parse_mode: "HTML" }
  );
}

async function askPositiveNumber(
  conversation: Conversation<Context>,
  ctx: Context,
  label: string,
  max: number
): Promise<number | null> {
  while (true) {
    const msgCtx = await conversation.waitFor("message:text");
    const text = msgCtx.message.text.trim();

    if (text === "/cancel") {
      await ctx.reply("Отменено.");
      return null;
    }

    const value = parseFloat(text.replace(",", "."));
    if (!isNaN(value) && value >= 0 && value <= max) {
      return value;
    }

    await ctx.reply(`Не похоже на число. Введи ${label} ещё раз:`);
  }
}
